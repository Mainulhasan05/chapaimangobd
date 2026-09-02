import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    rate: {
      type: Number,
      required: [true, 'Rate is required'],
      min: [0, 'Rate cannot be negative'],
    },
    subtotal: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required'],
      index: true,
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Order must have at least one item',
      },
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
    },
    // totalBill = sum(item.subtotal) - discount + courierCharge
    totalBill: {
      type: Number,
      required: [true, 'Total bill is required'],
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative'],
    },
    // orderDue = totalBill - paidAmount (specific to this order only)
    orderDue: {
      type: Number,
      required: true,
    },
    courierName: {
      type: String,
      trim: true,
    },
    courierTrackingId: {
      type: String,
      trim: true,
    },
    courierCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    deliveryAddress: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'returned',
      ],
      default: 'pending',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid'],
      default: 'unpaid',
    },
    notes: {
      type: String,
      trim: true,
    },
    importBatchId: {
      type: String,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

// Auto-calculate subtotals and totals before validation
orderSchema.pre('validate', function (next) {
  if (this.items && this.items.length > 0) {
    this.items.forEach((item) => {
      item.subtotal = item.quantity * item.rate;
    });

    const itemsTotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
    this.totalBill = itemsTotal - (this.discount || 0) + (this.courierCharge || 0);
    this.orderDue = this.totalBill - (this.paidAmount || 0);

    // Determine payment status
    if (this.paidAmount <= 0) {
      this.paymentStatus = 'unpaid';
    } else if (this.paidAmount >= this.totalBill) {
      this.paymentStatus = 'paid';
      this.orderDue = 0;
    } else {
      this.paymentStatus = 'partial';
    }
  }
  next();
});

// Compound indexes for common queries
orderSchema.index({ orderDate: -1 });
orderSchema.index({ customer: 1, orderDate: -1 });
orderSchema.index({ status: 1, orderDate: -1 });

const Order = mongoose.model('Order', orderSchema);
export default Order;
