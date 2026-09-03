import mongoose from 'mongoose';

const smsRecipientSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    phone: { type: String, required: true },
    name: { type: String },
  },
  { _id: false }
);

const smsResolvedSchema = new mongoose.Schema(
  {
    name: { type: String },
    phone: { type: String, required: true },
    text: { type: String, required: true },
    charCount: { type: Number },
    credits: { type: Number, default: 1 },
    isUnicode: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['sent', 'failed'],
      default: 'sent',
    },
    error: { type: String },
  },
  { _id: false }
);

const smsLogSchema = new mongoose.Schema(
  {
    recipients: [smsRecipientSchema],
    template: {
      type: String,
      required: [true, 'SMS template is required'],
    },
    resolvedTexts: [smsResolvedSchema],
    totalCredits: {
      type: Number,
      default: 1,
    },
    senderId: {
      type: String,
      default: '8809617639998',
    },
    totalSent: {
      type: Number,
      default: 0,
    },
    totalFailed: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'partial', 'failed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

smsLogSchema.index({ createdAt: -1 });

const SmsLog = mongoose.model('SmsLog', smsLogSchema);
export default SmsLog;
