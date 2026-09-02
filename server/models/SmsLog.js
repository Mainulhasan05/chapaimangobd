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
    phone: { type: String, required: true },
    text: { type: String, required: true },
    status: {
      type: String,
      enum: ['sent', 'failed'],
      default: 'sent',
    },
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
