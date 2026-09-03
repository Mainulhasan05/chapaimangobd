import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import {
  LogIn,
  Eye,
  EyeOff,
  UserPlus,
  KeyRound,
  Phone,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  RotateCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

const LoginPage = () => {
  // Mode: 'login' | 'register' | 'forgot'
  const [mode, setMode] = useState('login');

  // Login & Register Form State
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot Password Multi-Step State
  const [forgotStep, setForgotStep] = useState(1); // 1 = Phone, 2 = OTP, 3 = New Password
  const [forgotPhone, setForgotPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  // Cooldown countdown timer for resend OTP
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle Login & Register submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'register') {
        await register(form.name, form.email, form.password);
        toast.success('Account created successfully!');
      } else {
        await login(form.email, form.password);
        toast.success('Welcome back!');
      }
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Authentication failed');
    }
    setLoading(false);
  };

  // Step 1: Send OTP to phone
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!forgotPhone.trim()) {
      toast.error('Please enter your registered phone number');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authAPI.sendForgotPasswordOtp({ phone: forgotPhone.trim() });
      toast.success(data.message || 'OTP sent successfully to your phone!');
      setForgotStep(2);
      setResendCooldown(60); // 60s cooldown
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP. Please check your phone number.');
    }
    setLoading(false);
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      toast.error('Please enter the 6-digit OTP code');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authAPI.verifyForgotPasswordOtp({
        phone: forgotPhone.trim(),
        otp: otpCode.trim(),
      });
      toast.success('OTP verified successfully!');
      setResetToken(data.resetToken);
      setForgotStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP code');
    }
    setLoading(false);
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      const { data } = await authAPI.sendForgotPasswordOtp({ phone: forgotPhone.trim() });
      toast.success('A new OTP has been sent to your phone!');
      setResendCooldown(60);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP');
    }
    setLoading(false);
  };

  // Step 3: Set New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authAPI.resetPassword({
        resetToken,
        newPassword,
      });
      toast.success(data.message || 'Password reset successful! Please log in.');
      // Reset forgot states and return to login
      setMode('login');
      setForgotStep(1);
      setForgotPhone('');
      setOtpCode('');
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');
      setForm((prev) => ({ ...prev, password: '' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password. Please start over.');
    }
    setLoading(false);
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setForgotStep(1);
    setOtpCode('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          {/* Header */}
          <div className="login-header">
            <div className="login-logo">
              <div className="sidebar-brand-logo" style={{ width: 54, height: 54, fontSize: '1.75rem', background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' }}>
                🥭
              </div>
            </div>

            {mode === 'forgot' ? (
              <>
                <h1 className="login-title">
                  {forgotStep === 1 && 'Forgot Password'}
                  {forgotStep === 2 && 'Verify OTP Code'}
                  {forgotStep === 3 && 'Reset Password'}
                </h1>
                <p className="login-subtitle">
                  {forgotStep === 1 && 'Enter your registered phone number to receive an SMS verification code.'}
                  {forgotStep === 2 && `Enter the 6-digit code sent to ${forgotPhone}`}
                  {forgotStep === 3 && 'Create a new secure password for your account.'}
                </p>

                {/* Step indicator pills */}
                <div className="step-indicators">
                  <div className={`step-dot ${forgotStep >= 1 ? 'active' : ''}`}>1</div>
                  <div className={`step-line ${forgotStep >= 2 ? 'active' : ''}`} />
                  <div className={`step-dot ${forgotStep >= 2 ? 'active' : ''}`}>2</div>
                  <div className={`step-line ${forgotStep >= 3 ? 'active' : ''}`} />
                  <div className={`step-dot ${forgotStep >= 3 ? 'active' : ''}`}>3</div>
                </div>
              </>
            ) : (
              <>
                <h1 className="login-title">{mode === 'register' ? 'Create Account' : 'Chapai Mango Admin'}</h1>
                <p className="login-subtitle">
                  {mode === 'register'
                    ? 'Set up your admin account to manage chapaimango.bd'
                    : 'Sign in to chapaimango.bd admin portal'}
                </p>
              </>
            )}
          </div>

          {/* ==================================================== */}
          {/* FORGOT PASSWORD FLOW */}
          {/* ==================================================== */}
          {mode === 'forgot' ? (
            <div className="forgot-flow">
              {/* STEP 1: Phone Input */}
              {forgotStep === 1 && (
                <form onSubmit={handleSendOtp} className="login-form">
                  <div className="form-group">
                    <label className="form-label">Registered Phone Number</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 01711111111"
                        value={forgotPhone}
                        onChange={(e) => setForgotPhone(e.target.value)}
                        required
                        autoFocus
                        style={{ paddingLeft: 40 }}
                      />
                      <Phone
                        size={18}
                        style={{
                          position: 'absolute',
                          left: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--text-tertiary)',
                        }}
                      />
                    </div>
                    <small style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>
                      We will send a 6-digit verification code via SMS to this number.
                    </small>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={loading || !forgotPhone.trim()}
                    style={{ width: '100%', marginTop: 'var(--space-md)' }}
                  >
                    {loading ? (
                      <div className="spinner" />
                    ) : (
                      <>
                        <KeyRound size={18} />
                        Send OTP Code
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: OTP Verification */}
              {forgotStep === 2 && (
                <form onSubmit={handleVerifyOtp} className="login-form">
                  <div className="form-group">
                    <label className="form-label">6-Digit Verification Code</label>
                    <input
                      type="text"
                      className="form-input otp-input"
                      placeholder="• • • • • •"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                      required
                      autoFocus
                      style={{
                        textAlign: 'center',
                        letterSpacing: '0.5em',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => setForgotStep(1)}
                      style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Change Phone Number
                    </button>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || loading}
                      className="btn-link"
                      style={{
                        fontSize: '0.8125rem',
                        color: resendCooldown > 0 ? 'var(--text-tertiary)' : 'var(--accent-secondary)',
                        background: 'none',
                        border: 'none',
                        cursor: resendCooldown > 0 ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <RotateCw size={12} className={loading ? 'animate-spin' : ''} />
                      {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={loading || otpCode.length < 6}
                    style={{ width: '100%' }}
                  >
                    {loading ? (
                      <div className="spinner" />
                    ) : (
                      <>
                        <ShieldCheck size={18} />
                        Verify Code
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 3: Set New Password */}
              {forgotStep === 3 && (
                <form onSubmit={handleResetPassword} className="login-form">
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        className="form-input"
                        placeholder="At least 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        autoFocus
                        style={{ paddingRight: 44 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-tertiary)',
                          cursor: 'pointer',
                          padding: 4,
                        }}
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Re-type new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={loading || !newPassword || newPassword !== confirmPassword}
                    style={{ width: '100%', marginTop: 'var(--space-md)' }}
                  >
                    {loading ? (
                      <div className="spinner" />
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        Update Password & Sign In
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="login-footer" style={{ marginTop: 'var(--space-md)' }}>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="login-toggle"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <ArrowLeft size={16} /> Back to Sign In
                </button>
              </div>
            </div>
          ) : (
            /* ==================================================== */
            /* STANDARD LOGIN & REGISTRATION FLOW */
            /* ==================================================== */
            <>
              <form onSubmit={handleSubmit} className="login-form">
                {mode === 'register' && (
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter your name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Email or Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="admin@chapaimango.bd or 01711111111"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="btn-link"
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--accent-secondary)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Enter your password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                      minLength={6}
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        padding: 4,
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={loading}
                  style={{ width: '100%', marginTop: 'var(--space-sm)' }}
                >
                  {loading ? (
                    <div className="spinner" />
                  ) : mode === 'register' ? (
                    <>
                      <UserPlus size={18} />
                      Create Account
                    </>
                  ) : (
                    <>
                      <LogIn size={18} />
                      Sign In
                    </>
                  )}
                </button>
              </form>

              <div className="login-footer">
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'register' ? 'login' : 'register')}
                  className="login-toggle"
                >
                  {mode === 'register'
                    ? 'Already have an account? Sign In'
                    : "Don't have an account? Register"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          padding: var(--space-md);
          position: relative;
          overflow: hidden;
        }
        .login-page::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle at 30% 50%, rgba(108, 92, 231, 0.08) 0%, transparent 50%),
                      radial-gradient(circle at 70% 80%, rgba(162, 155, 254, 0.06) 0%, transparent 50%);
          pointer-events: none;
        }
        .login-container {
          width: 100%;
          max-width: 440px;
          position: relative;
          z-index: 1;
        }
        .login-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: var(--space-2xl);
          backdrop-filter: blur(16px);
          animation: slideUp var(--transition-slow) ease-out;
        }
        .login-header {
          text-align: center;
          margin-bottom: var(--space-xl);
        }
        .login-logo {
          display: flex;
          justify-content: center;
          margin-bottom: var(--space-lg);
        }
        .login-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: var(--space-sm);
          letter-spacing: -0.02em;
        }
        .login-subtitle {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        .login-form {
          margin-bottom: var(--space-lg);
        }
        .login-footer {
          text-align: center;
        }
        .login-toggle {
          background: none;
          border: none;
          color: var(--accent-secondary);
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: color var(--transition-fast);
        }
        .login-toggle:hover {
          color: var(--accent-primary-hover);
        }
        .step-indicators {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: var(--space-md);
          gap: 8px;
        }
        .step-dot {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--bg-input);
          border: 1px solid var(--border);
          color: var(--text-tertiary);
          font-size: 0.75rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
        }
        .step-dot.active {
          background: var(--accent-primary);
          color: #ffffff;
          border-color: var(--accent-primary);
          box-shadow: 0 0 10px rgba(108, 92, 231, 0.4);
        }
        .step-line {
          width: 28px;
          height: 2px;
          background: var(--border);
          transition: background var(--transition-fast);
        }
        .step-line.active {
          background: var(--accent-primary);
        }
        @media (max-width: 480px) {
          .login-card {
            padding: var(--space-lg);
          }
          .login-title {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;

