import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Payment from '../models/Payment.js';
import { createAuditLog } from '../utils/auditLogger.js';

// @desc    Get all orders
// @route   GET /api/orders
export const getOrders = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      customerId,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (customerId) query.customer = customerId;

    // Date range filter
    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = new Date(startDate);
      if (endDate) query.orderDate.$lte = new Date(endDate);
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('customer', 'name phone address totalDue')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
export const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      'customer',
      'name phone address totalDue totalPurchases totalPaid'
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Also get payments for this order
    const payments = await Payment.find({ order: order._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: { order, payments },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create order
// @route   POST /api/orders
export const createOrder = async (req, res, next) => {
  try {
    const {
      customer: customerId,
      items,
      discount,
      paidAmount,
      courierName,
      courierTrackingId,
      courierCharge,
      deliveryAddress,
      notes,
      orderDate,
    } = req.body;

    // Validate customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Create order (pre-validate hook calculates totals)
    const order = new Order({
      customer: customerId,
      items,
      discount: discount || 0,
      paidAmount: paidAmount || 0,
      courierName,
      courierTrackingId,
      courierCharge: courierCharge || 0,
      deliveryAddress: deliveryAddress || customer.address,
      notes,
      orderDate: orderDate || Date.now(),
    });

    await order.save();

    // Atomically update customer balance
    const updatedCustomer = await Customer.findByIdAndUpdate(
      customerId,
      {
        $inc: {
          totalPurchases: order.totalBill,
          totalPaid: order.paidAmount,
          totalDue: order.orderDue,
          orderCount: 1,
        },
      },
      { new: true }
    );

    // If there was a paid amount, create a payment record
    if (order.paidAmount > 0) {
      await Payment.create({
        customer: customerId,
        order: order._id,
        amount: order.paidAmount,
        method: 'cash',
        note: 'Payment with order',
        balanceAfter: updatedCustomer.totalDue,
      });
    }

    // Populate customer data before sending response
    await order.populate('customer', 'name phone address totalDue');

    await createAuditLog({
      req,
      action: 'ORDER_CREATE',
      category: 'ORDER',
      description: `Created mango order for ${customer.name} (Total: ৳${order.totalBill.toLocaleString()}, Due: ৳${order.orderDue.toLocaleString()})`,
      targetId: order._id,
      targetType: 'Order',
      details: {
        customerName: customer.name,
        customerPhone: customer.phone,
        totalBill: order.totalBill,
        paidAmount: order.paidAmount,
        orderDue: order.orderDue,
        items: order.items?.map((i) => `${i.productName} (${i.quantity}x)`),
        courier: order.courierName,
      },
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order
// @route   PUT /api/orders/:id
export const updateOrder = async (req, res, next) => {
  try {
    const {
      status,
      courierName,
      courierTrackingId,
      courierCharge,
      notes,
    } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const previousStatus = order.status;

    // Only allow updating certain fields (not items/amounts after creation)
    if (status) order.status = status;
    if (courierName !== undefined) order.courierName = courierName;
    if (courierTrackingId !== undefined) order.courierTrackingId = courierTrackingId;
    if (courierCharge !== undefined) order.courierCharge = courierCharge;
    if (notes !== undefined) order.notes = notes;

    // Handle cancellation — reverse the balance impact
    if (status === 'cancelled' && order.status !== 'cancelled') {
      await Customer.findByIdAndUpdate(order.customer, {
        $inc: {
          totalPurchases: -order.totalBill,
          totalPaid: -order.paidAmount,
          totalDue: -order.orderDue,
          orderCount: -1,
        },
      });
    }

    await order.save();
    await order.populate('customer', 'name phone address totalDue');

    await createAuditLog({
      req,
      action: status === 'cancelled' ? 'ORDER_CANCEL' : 'ORDER_UPDATE',
      category: 'ORDER',
      description: status !== previousStatus 
        ? `Order status changed from "${previousStatus}" to "${order.status}" for customer ${order.customer?.name}`
        : `Updated order details for customer ${order.customer?.name}`,
      targetId: order._id,
      targetType: 'Order',
      details: {
        previousStatus,
        newStatus: order.status,
        courierName: order.courierName,
      },
    });

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Add payment to specific order
// @route   POST /api/orders/:id/payment
export const addOrderPayment = async (req, res, next) => {
  try {
    const { amount, method, note } = req.body;
    const orderId = req.params.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0',
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Update order payment
    order.paidAmount += amount;
    order.orderDue = order.totalBill - order.paidAmount;

    if (order.paidAmount >= order.totalBill) {
      order.paymentStatus = 'paid';
      order.orderDue = 0;
    } else {
      order.paymentStatus = 'partial';
    }

    await order.save();

    // Atomically update customer balance
    const customer = await Customer.findByIdAndUpdate(
      order.customer,
      {
        $inc: {
          totalPaid: amount,
          totalDue: -amount,
        },
      },
      { new: true }
    );

    // Create payment record
    const payment = await Payment.create({
      customer: order.customer,
      order: orderId,
      amount,
      method: method || 'cash',
      note,
      balanceAfter: customer.totalDue,
    });

    await order.populate('customer', 'name phone address totalDue');

    await createAuditLog({
      req,
      action: 'PAYMENT_RECORD',
      category: 'PAYMENT',
      description: `Collected payment of ৳${amount.toLocaleString()} via ${(method || 'cash').toUpperCase()} for order #${order._id.toString().slice(-6)} (${customer?.name})`,
      targetId: payment._id,
      targetType: 'Payment',
      details: {
        orderId: order._id,
        customerName: customer?.name,
        amount,
        method: method || 'cash',
        balanceAfter: customer.totalDue,
      },
    });

    res.status(201).json({
      success: true,
      data: { order, payment },
    });
  } catch (error) {
    next(error);
  }
};
