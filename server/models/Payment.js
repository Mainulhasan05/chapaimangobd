import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required'],
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null, // null for general payments not tied to a specific order
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [1, 'Payment amount must be at least 1'],
    },
    method: {
      type: String,
      enum: ['cash', 'bkash', 'nagad', 'rocket', 'bank', 'other'],
      default: 'cash',
    },
    note: {
      type: String,
      trim: true,
    },
    // Snapshot of the customer's totalDue AFTER this payment was applied
    balanceAfter: {
      type: Number,
    },
  },
  { timestamps: true }
);

// Indexes for ledger queries
paymentSchema.index({ customer: 1, createdAt: -1 });
paymentSchema.index({ order: 1 });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
