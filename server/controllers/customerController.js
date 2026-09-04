import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import SmsLog from '../models/SmsLog.js';
import Setting from '../models/Setting.js';
import { sendSms, cleanSmsText } from '../utils/smsService.js';
import { calculateSmsCredits } from './smsController.js';
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

// Helper to generate unique 6-character short code for customer public bill URL
export const generateUniqueShortCode = async () => {
  const characters = '23456789abcdefghjkmnpqrstuvwxyz';
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const exists = await Customer.findOne({ billShortCode: code });
    if (!exists) return code;
  }
  return Math.random().toString(36).substring(2, 8);
};

// @desc    Create customer
// @route   POST /api/customers
export const createCustomer = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      altPhone,
      address,
      area,
      openingBalance,
      notes,
      totalBill,
      totalPurchases,
      currentDue,
      totalDue,
      billDetailsText,
      billImageUrl,
      billShortCode,
      sendSms: shouldSendSms,
      smsMessage,
    } = req.body;

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

    // Determine financial amounts (Total Bill and Current Due)
    const billAmount = parseFloat(totalBill !== undefined ? totalBill : totalPurchases) || 0;
    const dueAmount = parseFloat(currentDue !== undefined ? currentDue : (totalDue !== undefined ? totalDue : openingBalance)) || 0;
    const paidAmount = Math.max(0, billAmount - dueAmount);

    // Resolve or generate unique bill short code
    let finalShortCode = billShortCode && billShortCode.trim() ? billShortCode.trim() : '';
    if (!finalShortCode) {
      finalShortCode = await generateUniqueShortCode();
    }

    const customer = await Customer.create({
      name,
      phone: cleanPhone,
      altPhone: cleanAltPhone,
      address,
      area,
      openingBalance: dueAmount,
      totalDue: dueAmount,
      totalPurchases: billAmount,
      totalPaid: paidAmount,
      notes,
      billShortCode: finalShortCode,
      billDetailsText: billDetailsText || '',
      billImageUrl: billImageUrl || '',
    });

    let smsResult = null;
    if (shouldSendSms && smsMessage && smsMessage.trim()) {
      try {
        const trimmedMessage = cleanSmsText(smsMessage);
        const customSenderId = await Setting.get('smsSenderId', process.env.SMS_SENDER_ID || '8809617639998');
        const sendRes = await sendSms({ to: cleanPhone, message: trimmedMessage });
        const stats = calculateSmsCredits(trimmedMessage);

        const smsLog = await SmsLog.create({
          recipients: [{ customer: customer._id, phone: customer.phone, name: customer.name }],
          template: trimmedMessage,
          resolvedTexts: [
            {
              name: customer.name,
              phone: customer.phone,
              text: trimmedMessage,
              charCount: stats.charCount,
              credits: stats.credits,
              isUnicode: stats.isUnicode,
              status: sendRes.success ? 'sent' : 'failed',
              error: sendRes.error,
            },
          ],
          totalCredits: stats.credits,
          senderId: customSenderId || process.env.SMS_SENDER_ID || '8809617639998',
          totalSent: sendRes.success ? 1 : 0,
          totalFailed: sendRes.success ? 0 : 1,
          status: sendRes.success ? 'sent' : 'failed',
        });

        if (sendRes.success) {
          customer.totalSmsSent = 1;
          customer.lastSmsSentAt = new Date();
          await customer.save();
        }

        smsResult = {
          success: sendRes.success,
          error: sendRes.error,
          credits: stats.credits,
          logId: smsLog._id,
        };

        await createAuditLog({
          req,
          action: 'SMS_CUSTOMER_ONBOARD',
          category: 'SMS',
          description: sendRes.success
            ? `Dispatched reminder SMS to new customer: ${customer.name} (${customer.phone})`
            : `Failed to dispatch reminder SMS to new customer: ${customer.name} (${customer.phone}): ${sendRes.error}`,
          targetId: smsLog._id,
          targetType: 'SMS',
          status: sendRes.success ? 'SUCCESS' : 'FAILED',
          details: { phone: customer.phone, message: trimmedMessage, error: sendRes.error },
        });
      } catch (smsErr) {
        console.error('[createCustomer SMS dispatch error]:', smsErr.message);
        smsResult = { success: false, error: smsErr.message };
      }
    }

    await createAuditLog({
      req,
      action: 'CUSTOMER_CREATE',
      category: 'CUSTOMER',
      description: `Created customer: ${customer.name} (${customer.phone}) [Bill: ৳${customer.totalPurchases}, Due: ৳${customer.totalDue}]`,
      targetId: customer._id,
      targetType: 'Customer',
      details: {
        name: customer.name,
        phone: customer.phone,
        area: customer.area,
        totalPurchases: customer.totalPurchases,
        totalDue: customer.totalDue,
        totalPaid: customer.totalPaid,
        billShortCode: customer.billShortCode,
        smsSent: smsResult?.success || false,
      },
    });

    res.status(201).json({ success: true, data: customer, smsResult });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
export const updateCustomer = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      altPhone,
      address,
      area,
      notes,
      status,
      totalBill,
      totalPurchases,
      currentDue,
      totalDue,
      billDetailsText,
      billImageUrl,
      billShortCode,
    } = req.body;

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

    const updateFields = {
      name,
      ...(cleanPhone && { phone: cleanPhone }),
      ...(cleanAltPhone !== undefined && { altPhone: cleanAltPhone }),
      address,
      area,
      notes,
      status,
    };

    if (billDetailsText !== undefined) {
      updateFields.billDetailsText = billDetailsText;
    }
    if (billImageUrl !== undefined) {
      updateFields.billImageUrl = billImageUrl;
    }
    if (billShortCode !== undefined && billShortCode.trim()) {
      updateFields.billShortCode = billShortCode.trim();
    }

    const hasBill = totalBill !== undefined || totalPurchases !== undefined;
    const hasDue = currentDue !== undefined || totalDue !== undefined;

    if (hasBill) {
      updateFields.totalPurchases = parseFloat(totalBill !== undefined ? totalBill : totalPurchases) || 0;
    }
    if (hasDue) {
      updateFields.totalDue = parseFloat(currentDue !== undefined ? currentDue : totalDue) || 0;
    }
    if (hasBill && hasDue) {
      updateFields.totalPaid = Math.max(0, updateFields.totalPurchases - updateFields.totalDue);
    } else if (hasBill || hasDue) {
      const existing = await Customer.findById(req.params.id);
      if (existing) {
        const finalBill = hasBill ? updateFields.totalPurchases : (existing.totalPurchases || 0);
        const finalDue = hasDue ? updateFields.totalDue : (existing.totalDue || 0);
        updateFields.totalPaid = Math.max(0, finalBill - finalDue);
      }
    }

    // Ensure customer has a billShortCode
    const existingCust = await Customer.findById(req.params.id);
    if (existingCust && !existingCust.billShortCode && !updateFields.billShortCode) {
      updateFields.billShortCode = await generateUniqueShortCode();
    }

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      updateFields,
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
      details: {
        name,
        phone,
        address,
        area,
        status,
        totalPurchases: customer.totalPurchases,
        totalDue: customer.totalDue,
        billShortCode: customer.billShortCode,
      },
    });

    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload bill screenshot / memo image
// @route   POST /api/customers/upload-image
export const uploadBillImage = (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select an image file to upload',
      });
    }

    const relativeUrl = `/uploads/bills/${req.file.filename}`;

    res.status(200).json({
      success: true,
      data: {
        url: relativeUrl,
        filename: req.file.filename,
        size: req.file.size,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public customer bill & payment details (No auth required)
// @route   GET /api/customers/public-bill/:shortCode
export const getPublicCustomerBill = async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    if (!shortCode) {
      return res.status(400).json({
        success: false,
        message: 'Short code is required',
      });
    }

    let customer = await Customer.findOne({ billShortCode: shortCode });
    if (!customer && shortCode.length === 24 && /^[0-9a-fA-F]+$/.test(shortCode)) {
      customer = await Customer.findById(shortCode);
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Bill information not found. Please verify your link.',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        area: customer.area,
        totalPurchases: customer.totalPurchases || 0,
        totalDue: customer.totalDue || 0,
        totalPaid: customer.totalPaid || 0,
        billDetailsText: customer.billDetailsText || '',
        billImageUrl: customer.billImageUrl || '',
        notes: customer.notes || '',
        billShortCode: customer.billShortCode,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      },
    });
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
