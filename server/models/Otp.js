import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const otpSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: [true, 'Identifier is required'],
      trim: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['FORGOT_PASSWORD', 'LOGIN', 'REGISTER', 'VERIFY_PHONE'],
      default: 'FORGOT_PASSWORD',
    },
    attempts: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    resetToken: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // TTL index: auto-deletes document when expiresAt timestamp is reached
    },
  },
  { timestamps: true }
);

// Method to verify candidate OTP
otpSchema.methods.compareOtp = async function (candidateOtp) {
  return await bcrypt.compare(candidateOtp.toString(), this.otpHash);
};

// Static helper to hash and create an OTP document
otpSchema.statics.createOtp = async function ({ identifier, otp, purpose = 'FORGOT_PASSWORD', expiryMinutes = 5 }) {
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(otp.toString(), salt);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  // Delete any pending OTPs for the same identifier and purpose
  await this.deleteMany({ identifier, purpose });

  return await this.create({
    identifier,
    otpHash,
    purpose,
    expiresAt,
  });
};

const Otp = mongoose.model('Otp', otpSchema);
export default Otp;
