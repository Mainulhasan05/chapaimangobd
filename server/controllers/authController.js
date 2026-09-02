import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import { sendSms, formatMsisdn } from '../utils/smsService.js';
import { createAuditLog } from '../utils/auditLogger.js';

// Helper to normalize phone numbers for searching
const normalizePhoneNumber = (phone) => {
  if (!phone) return '';
  let cleaned = phone.toString().replace(/[^0-9]/g, '');
  if (cleaned.startsWith('880') && cleaned.length === 13) {
    cleaned = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('88') && cleaned.length === 13) {
    cleaned = '0' + cleaned.substring(2);
  }
  return cleaned;
};

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// Send token in cookie
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({ success: true, token, user: userData });
};

// @desc    Register admin user
// @route   POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, phone, password, role } = req.body;

    // Check if any admin already exists (first-time setup only, or allow if admin is creating)
    const existingAdmin = await User.countDocuments();
    if (existingAdmin > 0 && !req.user) {
      return res.status(403).json({
        success: false,
        message: 'Registration is closed. Please login or contact the administrator.',
      });
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: role || 'admin',
    });

    await createAuditLog({
      req,
      user,
      action: 'ADMIN_REGISTER',
      category: 'AUTH',
      description: `New administrator registered: ${name} (${email})`,
      targetId: user._id,
      targetType: 'User',
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/phone and password',
      });
    }

    // Support logging in with email or phone
    const normalized = normalizePhoneNumber(email);
    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phone: email },
        { phone: normalized },
      ],
    }).select('+password');

    if (!user) {
      await createAuditLog({
        req,
        action: 'AUTH_LOGIN_FAILED',
        category: 'AUTH',
        description: `Failed login attempt for identifier: ${email}`,
        status: 'FAILED',
        details: { identifier: email },
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      await createAuditLog({
        req,
        user,
        action: 'AUTH_LOGIN_FAILED',
        category: 'AUTH',
        description: `Invalid password for user: ${user.name} (${user.email || user.phone})`,
        status: 'FAILED',
        targetId: user._id,
        targetType: 'User',
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    await createAuditLog({
      req,
      user,
      action: 'AUTH_LOGIN',
      category: 'AUTH',
      description: `Administrator signed in: ${user.name} (${user.email || user.phone})`,
      targetId: user._id,
      targetType: 'User',
    });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout
// @route   POST /api/auth/logout
export const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await createAuditLog({
        req,
        action: 'AUTH_LOGOUT',
        category: 'AUTH',
        description: `Administrator logged out: ${req.user.name}`,
        targetId: req.user._id,
        targetType: 'User',
      });
    }

    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 5 * 1000),
      httpOnly: true,
    });

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Send OTP for Forgot Password
// @route   POST /api/auth/forgot-password/send-otp
export const forgotPasswordSendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered phone number',
      });
    }

    const normalized = normalizePhoneNumber(phone);
    const formatted = formatMsisdn(phone);

    // Find user by phone (try normalized formats)
    const user = await User.findOne({
      $or: [
        { phone: phone.trim() },
        { phone: normalized },
        { phone: formatted },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this phone number',
      });
    }

    const identifier = user.phone || normalized;

    // Check rate limit (60-second cooldown)
    const existingOtp = await Otp.findOne({
      identifier,
      purpose: 'FORGOT_PASSWORD',
    });

    if (existingOtp) {
      const elapsedMs = Date.now() - new Date(existingOtp.createdAt).getTime();
      if (elapsedMs < 60 * 1000) {
        const remainingSeconds = Math.ceil((60 * 1000 - elapsedMs) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${remainingSeconds}s before requesting another OTP`,
        });
      }
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in DB (hashed, 5 minute TTL)
    await Otp.createOtp({
      identifier,
      otp: otpCode,
      purpose: 'FORGOT_PASSWORD',
      expiryMinutes: 5,
    });

    // Send SMS via Automas gateway
    const message = `Your Himel Admin verification code is ${otpCode}. Valid for 5 minutes. Do not share this code.`;
    const smsResult = await sendSms({ to: user.phone || phone, message });

    if (!smsResult.success) {
      return res.status(500).json({
        success: false,
        message: smsResult.error || 'Failed to send SMS. Please try again.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP has been sent to your phone number',
      phone: user.phone,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP for Forgot Password
// @route   POST /api/auth/forgot-password/verify-otp
export const forgotPasswordVerifyOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and 6-digit OTP are required',
      });
    }

    const normalized = normalizePhoneNumber(phone);
    const formatted = formatMsisdn(phone);

    // Find OTP doc for this identifier
    const otpDoc = await Otp.findOne({
      identifier: { $in: [phone.trim(), normalized, formatted] },
      purpose: 'FORGOT_PASSWORD',
      expiresAt: { $gt: new Date() },
    });

    if (!otpDoc) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired or is invalid. Please request a new one.',
      });
    }

    if (otpDoc.attempts >= 5) {
      await Otp.deleteOne({ _id: otpDoc._id });
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Please request a new OTP.',
      });
    }

    const isMatch = await otpDoc.compareOtp(otp);
    if (!isMatch) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      const remaining = 5 - otpDoc.attempts;
      return res.status(400).json({
        success: false,
        message: `Invalid OTP code. ${remaining} attempts remaining.`,
      });
    }

    // Generate short-lived reset token (15 mins)
    const resetToken = jwt.sign(
      { identifier: otpDoc.identifier, purpose: 'RESET_PASSWORD' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    otpDoc.isVerified = true;
    otpDoc.resetToken = resetToken;
    await otpDoc.save();

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      resetToken,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password with verified reset token
// @route   POST /api/auth/forgot-password/reset
export const forgotPasswordReset = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Reset session expired or invalid. Please start over.',
      });
    }

    if (decoded.purpose !== 'RESET_PASSWORD') {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token',
      });
    }

    // Ensure OTP record was actually verified
    const otpDoc = await Otp.findOne({
      identifier: decoded.identifier,
      resetToken,
      isVerified: true,
      purpose: 'FORGOT_PASSWORD',
    });

    if (!otpDoc) {
      return res.status(400).json({
        success: false,
        message: 'Reset session not verified or already used. Please start over.',
      });
    }

    // Find the user
    const normalized = normalizePhoneNumber(decoded.identifier);
    const formatted = formatMsisdn(decoded.identifier);

    const user = await User.findOne({
      $or: [
        { phone: decoded.identifier },
        { phone: normalized },
        { phone: formatted },
        { email: decoded.identifier.toLowerCase() },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
      });
    }

    // Update password (pre-save hook will hash it)
    user.password = newPassword;
    await user.save();

    // Clean up OTP documents
    await Otp.deleteMany({
      identifier: { $in: [decoded.identifier, normalized, formatted] },
      purpose: 'FORGOT_PASSWORD',
    });

    await createAuditLog({
      req,
      user,
      action: 'AUTH_PASSWORD_RESET',
      category: 'AUTH',
      description: `Password reset successfully via SMS OTP for: ${user.name} (${user.email || user.phone})`,
      targetId: user._id,
      targetType: 'User',
    });

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

