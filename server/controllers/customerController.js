import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import { createAuditLog } from '../utils/auditLogger.js';

/**
 * Normalizes BD phone numbers to 11 digits
 */
export const normalizePhone = (phone) => {
  if (!phone) return '';
  let digits = phone.toString().replace(/\D/g, '');
  if ((digits.startsWith('8801') || digits.startsWith('880')) && digits.length >= 13) {
    digits = digits.slice(2);
  } else if (digits.startsWith('88') && digits.length === 13) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 11);
};

// @desc    Get all customers
// @route   GET /api/customers
export const getCustomers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      hasDue,
    } = req.query;

    const query = {};

    // Text search by name or phone
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) query.status = status;
    if (hasDue === 'true') query.totalDue = { $gt: 0 };
    if (hasDue === 'false') query.totalDue = { $lte: 0 };

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [customers, total] = await Promise.all([
      Customer.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
      Customer.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: customers,
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

// @desc    Get single customer with ledger
// @route   GET /api/customers/:id
export const getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Create customer
// @route   POST /api/customers
export const createCustomer = async (req, res, next) => {
  try {
    const { name, phone, altPhone, address, area, openingBalance, notes } = req.body;

    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length !== 11 || !cleanPhone.startsWith('01')) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be exactly 11 digits starting with 01 (e.g. 017XXXXXXXX)',
      });
    }

    const cleanAltPhone = altPhone ? normalizePhone(altPhone) : undefined;
    if (cleanAltPhone && (cleanAltPhone.length !== 11 || !cleanAltPhone.startsWith('01'))) {
      return res.status(400).json({
        success: false,
        message: 'Alternative phone number must be exactly 11 digits (e.g. 017XXXXXXXX)',
      });
    }

    const customer = await Customer.create({
      name,
      phone: cleanPhone,
      altPhone: cleanAltPhone,
      address,
      area,
      openingBalance: openingBalance || 0,
      notes,
    });

    await createAuditLog({
      req,
      action: 'CUSTOMER_CREATE',
      category: 'CUSTOMER',
      description: `Created customer: ${customer.name} (${customer.phone})`,
      targetId: customer._id,
      targetType: 'Customer',
      details: {
        name: customer.name,
        phone: customer.phone,
        area: customer.area,
        openingBalance: customer.openingBalance,
      },
    });

    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
export const updateCustomer = async (req, res, next) => {
  try {
    const { name, phone, altPhone, address, area, notes, status } = req.body;

    const cleanPhone = phone ? normalizePhone(phone) : undefined;
    if (cleanPhone && (cleanPhone.length !== 11 || !cleanPhone.startsWith('01'))) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be exactly 11 digits starting with 01 (e.g. 017XXXXXXXX)',
      });
    }

    const cleanAltPhone = altPhone ? normalizePhone(altPhone) : undefined;
    if (cleanAltPhone && (cleanAltPhone.length !== 11 || !cleanAltPhone.startsWith('01'))) {
      return res.status(400).json({
        success: false,
        message: 'Alternative phone number must be exactly 11 digits (e.g. 017XXXXXXXX)',
      });
    }

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      {
        name,
        ...(cleanPhone && { phone: cleanPhone }),
        ...(cleanAltPhone !== undefined && { altPhone: cleanAltPhone }),
        address,
        area,
        notes,
        status,
      },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    await createAuditLog({
      req,
      action: 'CUSTOMER_UPDATE',
      category: 'CUSTOMER',
      description: `Updated customer profile: ${customer.name} (${customer.phone})`,
      targetId: customer._id,
      targetType: 'Customer',
      details: { name, phone, address, area, status },
    });

    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer ledger (orders + payments timeline)
// @route   GET /api/customers/:id/ledger
export const getCustomerLedger = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Fetch orders and payments in parallel
    const [orders, payments] = await Promise.all([
      Order.find({ customer: id }).sort({ orderDate: -1 }),
      Payment.find({ customer: id }).sort({ createdAt: -1 }),
    ]);

    // Merge into a single timeline
    const ledger = [
      ...orders.map((o) => ({
        type: 'order',
        date: o.orderDate,
        amount: o.totalBill,
        paid: o.paidAmount,
        due: o.orderDue,
        status: o.status,
        reference: o._id,
        details: o,
      })),
      ...payments.map((p) => ({
        type: 'payment',
        date: p.createdAt,
        amount: p.amount,
        method: p.method,
        balanceAfter: p.balanceAfter,
        reference: p._id,
        orderId: p.order,
        note: p.note,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Paginate the merged ledger
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedLedger = ledger.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        customer,
        ledger: paginatedLedger,
        total: ledger.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record a general payment for a customer
// @route   POST /api/customers/:id/payment
export const recordPayment = async (req, res, next) => {
  try {
    const { amount, method, note } = req.body;
    const customerId = req.params.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0',
      });
    }

    // Atomically update customer balance
    const customer = await Customer.findByIdAndUpdate(
      customerId,
      {
        $inc: {
          totalPaid: amount,
          totalDue: -amount,
        },
      },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Create payment record
    const payment = await Payment.create({
      customer: customerId,
      amount,
      method: method || 'cash',
      note,
      balanceAfter: customer.totalDue,
    });

    // Auto-reconcile with customer's unpaid / partially paid orders (FIFO)
    let remainingPaymentToAllocate = amount;
    const unpaidOrders = await Order.find({
      customer: customerId,
      status: { $ne: 'cancelled' },
      orderDue: { $gt: 0 },
    }).sort({ orderDate: 1 });

    for (const ord of unpaidOrders) {
      if (remainingPaymentToAllocate <= 0) break;

      const paymentForOrder = Math.min(remainingPaymentToAllocate, ord.orderDue);
      ord.paidAmount += paymentForOrder;
      ord.orderDue -= paymentForOrder;
      remainingPaymentToAllocate -= paymentForOrder;

      if (ord.orderDue <= 0) {
        ord.paymentStatus = 'paid';
        ord.orderDue = 0;
      } else {
        ord.paymentStatus = 'partial';
      }

      await ord.save();
    }

    await createAuditLog({
      req,
      action: 'PAYMENT_RECORD',
      category: 'PAYMENT',
      description: `Collected customer payment of ৳${amount.toLocaleString()} via ${(method || 'cash').toUpperCase()} for ${customer.name} (Balance remaining: ৳${customer.totalDue.toLocaleString()})`,
      targetId: payment._id,
      targetType: 'Payment',
      details: {
        customerId: customer._id,
        customerName: customer.name,
        amount,
        method: method || 'cash',
        note,
        balanceAfter: customer.totalDue,
      },
    });

    res.status(201).json({ success: true, data: { payment, customer } });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
export const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Check associated records
    const [orderCount, paymentCount] = await Promise.all([
      Order.countDocuments({ customer: customer._id }),
      Payment.countDocuments({ customer: customer._id }),
    ]);

    // Cascade delete associated orders and payments
    if (orderCount > 0) {
      await Order.deleteMany({ customer: customer._id });
    }
    if (paymentCount > 0) {
      await Payment.deleteMany({ customer: customer._id });
    }

    await Customer.findByIdAndDelete(customer._id);

    await createAuditLog({
      req,
      action: 'CUSTOMER_DELETE',
      category: 'CUSTOMER',
      description: `Deleted customer ${customer.name} (${customer.phone})${orderCount > 0 ? ` and associated ${orderCount} orders` : ''}`,
      targetId: customer._id,
      targetType: 'Customer',
      details: {
        name: customer.name,
        phone: customer.phone,
        totalDue: customer.totalDue,
        totalPurchases: customer.totalPurchases,
        orderCount,
        paymentCount,
      },
    });

    res.status(200).json({
      success: true,
      message: `Customer ${customer.name} deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};
