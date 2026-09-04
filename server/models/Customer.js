import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    altPhone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    area: {
      type: String,
      trim: true,
      index: true,
    },
    // --- Balance Tracking ---
    // openingBalance: The "Previous Due" imported when onboarding an existing customer.
    // This value is set once during creation and should not be modified afterward.
    openingBalance: {
      type: Number,
      default: 0,
      min: [0, 'Opening balance cannot be negative'],
    },
    // totalDue: Real-time running balance.
    // Formula: openingBalance + totalPurchases - totalPaid
    // Updated atomically via $inc on every order/payment mutation.
    totalDue: {
      type: Number,
      default: 0,
    },
    // Lifetime aggregate values for quick dashboard stats
    totalPurchases: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    orderCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSmsSent: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastSmsSentAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    // Public bill & payment link fields
    billShortCode: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true,
    },
    billDetailsText: {
      type: String,
      trim: true,
    },
    billImageUrl: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// On creation, initialize totalDue to openingBalance if not explicitly set
customerSchema.pre('save', function (next) {
  if (this.isNew) {
    if ((this.totalDue === undefined || this.totalDue === null) && this.openingBalance > 0) {
      this.totalDue = this.openingBalance;
    }
  }
  next();
});

// Compound index for common queries
customerSchema.index({ status: 1, totalDue: -1 });
customerSchema.index({ name: 'text', phone: 'text' });

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
