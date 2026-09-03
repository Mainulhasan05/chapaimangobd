import axios from 'axios';
import Customer from '../models/Customer.js';
import SmsLog from '../models/SmsLog.js';
import Setting from '../models/Setting.js';
import { sendSms, sendBulkDynamicSms } from '../utils/smsService.js';
import { createAuditLog } from '../utils/auditLogger.js';

// Template variable resolver
const resolveTemplate = (template, data) => {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
};

// Helper to append SMS footer/signature
const appendFooterIfConfigured = (text, footer = 'ChapaiMango.bd', append = true) => {
  if (!text || !append || !footer || !footer.trim()) return text;
  const cleanFooter = footer.trim();
  if (text.includes(cleanFooter)) return text;
  const separator = cleanFooter.startsWith('-') || cleanFooter.startsWith('\n') ? ' ' : ' - ';
  return `${text.trim()}${separator}${cleanFooter}`;
};

// Calculate SMS token credits according to GSM and Unicode standards
export const calculateSmsCredits = (text) => {
  if (!text) return { charCount: 0, credits: 0, isUnicode: false };
  const clean = text.toString();
  const charCount = clean.length;
  const isUnicode = /[^\u0000-\u007F]/.test(clean);
  let credits = 1;
  if (isUnicode) {
    // Unicode: <= 70 chars is 1 SMS, then 67 chars per part
    credits = charCount <= 70 ? 1 : Math.ceil(charCount / 67);
  } else {
    // ASCII/GSM: <= 160 chars is 1 SMS, then 153 chars per part
    credits = charCount <= 160 ? 1 : Math.ceil(charCount / 153);
  }
  return { charCount, credits, isUnicode };
};

// Single Source of Truth for generating exact rendered SMS text
export const buildFinalSmsText = ({ template, customer, smsFooter = 'ChapaiMango.bd', appendSmsFooter = true }) => {
  const data = {
    name: customer.name || '',
    phone: customer.phone || '',
    totalDue: customer.totalDue !== undefined ? customer.totalDue : 0,
    totalPurchases: customer.totalPurchases !== undefined ? customer.totalPurchases : 0,
    totalPaid: customer.totalPaid !== undefined ? customer.totalPaid : 0,
    address: customer.address || '',
    area: customer.area || '',
  };

  const rawText = resolveTemplate(template, data);
  return appendFooterIfConfigured(rawText, smsFooter, appendSmsFooter);
};

// @desc    Send bulk SMS via Automas Gateway
// @route   POST /api/sms/send
export const sendBulkSms = async (req, res, next) => {
  try {
    const { customerIds, template } = req.body;

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one customer',
      });
    }

    if (!template) {
      return res.status(400).json({
        success: false,
        message: 'SMS template is required',
      });
    }

    // Fetch dynamic SMS footer and sender settings
    const [smsFooter, appendSmsFooter, customSenderId] = await Promise.all([
      Setting.get('smsFooter', 'ChapaiMango.bd'),
      Setting.get('appendSmsFooter', true),
      Setting.get('smsSenderId', process.env.SMS_SENDER_ID || '8809617639998'),
    ]);

    // Fetch selected customers
    const customers = await Customer.find({ _id: { $in: customerIds } });

    if (customers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No customers found',
      });
    }

    const recipients = [];
    const smsItems = [];
    let calculatedTotalCredits = 0;

    for (const customer of customers) {
      // Use the exact same helper to guarantee preview matches delivery 100%
      const resolvedText = buildFinalSmsText({
        template,
        customer,
        smsFooter,
        appendSmsFooter,
      });

      const stats = calculateSmsCredits(resolvedText);
      calculatedTotalCredits += stats.credits;

      recipients.push({
        customer: customer._id,
        phone: customer.phone,
        name: customer.name,
      });

      smsItems.push({
        customer: customer._id,
        phone: customer.phone,
        name: customer.name,
        text: resolvedText,
        charCount: stats.charCount,
        credits: stats.credits,
        isUnicode: stats.isUnicode,
      });
    }

    // Execute SMS dispatch through Automas Gateway
    const sendResults = await sendBulkDynamicSms(smsItems);

    let totalSent = 0;
    let totalFailed = 0;
    const resolvedTexts = [];

    sendResults.forEach((r, idx) => {
      if (r.status === 'sent') totalSent++;
      else totalFailed++;

      const item = smsItems[idx] || {};
      resolvedTexts.push({
        name: item.name || '',
        phone: r.phone,
        text: r.text,
        charCount: item.charCount || r.text.length,
        credits: item.credits || calculateSmsCredits(r.text).credits,
        isUnicode: item.isUnicode !== undefined ? item.isUnicode : calculateSmsCredits(r.text).isUnicode,
        status: r.status,
        error: r.error,
      });
    });

    // Determine overall status
    let status = 'sent';
    if (totalFailed === customers.length) status = 'failed';
    else if (totalFailed > 0) status = 'partial';

    // Log the SMS batch with exact content and token cost
    const smsLog = await SmsLog.create({
      recipients,
      template,
      resolvedTexts,
      totalCredits: calculatedTotalCredits,
      senderId: customSenderId || process.env.SMS_SENDER_ID || '8809617639998',
      totalSent,
      totalFailed,
      status,
    });

    await createAuditLog({
      req,
      action: 'SMS_BROADCAST',
      category: 'SMS',
      description: `Dispatched SMS broadcast to ${customers.length} recipients (${totalSent} delivered, ${totalFailed} failed)`,
      targetId: smsLog._id,
      targetType: 'SMS',
      status: totalFailed === customers.length ? 'FAILED' : totalFailed > 0 ? 'WARNING' : 'SUCCESS',
      details: {
        totalRecipients: customers.length,
        totalSent,
        totalFailed,
        template,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        smsLog,
        summary: {
          total: customers.length,
          sent: totalSent,
          failed: totalFailed,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a single test SMS
// @route   POST /api/sms/test
export const sendTestSms = async (req, res, next) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and message are required',
      });
    }

    const [smsFooter, appendSmsFooter, customSenderId] = await Promise.all([
      Setting.get('smsFooter', 'ChapaiMango.bd'),
      Setting.get('appendSmsFooter', true),
      Setting.get('smsSenderId', process.env.SMS_SENDER_ID || '8809617639998'),
    ]);

    const finalMessage = appendFooterIfConfigured(message, smsFooter, appendSmsFooter);

    const result = await sendSms({ to: phone, message: finalMessage });

    if (!result.success) {
      await createAuditLog({
        req,
        action: 'SMS_TEST',
        category: 'SMS',
        description: `Failed to send test SMS to ${phone}`,
        status: 'FAILED',
        details: { phone, error: result.error },
      });

      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to send test SMS via Automas gateway',
      });
    }

    const stats = calculateSmsCredits(finalMessage);

    // Also persist single / test SMS in SmsLog so history is completely comprehensive
    const testLog = await SmsLog.create({
      recipients: [{ phone, name: 'Direct / Test Recipient' }],
      template: message,
      resolvedTexts: [
        {
          name: 'Direct / Test Recipient',
          phone,
          text: finalMessage,
          charCount: stats.charCount,
          credits: stats.credits,
          isUnicode: stats.isUnicode,
          status: 'sent',
        },
      ],
      totalCredits: stats.credits,
      senderId: customSenderId || process.env.SMS_SENDER_ID || '8809617639998',
      totalSent: 1,
      totalFailed: 0,
      status: 'sent',
    });

    await createAuditLog({
      req,
      action: 'SMS_TEST',
      category: 'SMS',
      description: `Dispatched test SMS to ${phone} via Automas gateway`,
      details: { phone, message: finalMessage, credits: stats.credits },
    });

    res.status(200).json({
      success: true,
      message: 'Test SMS sent successfully!',
      data: {
        result,
        smsLog: testLog,
        credits: stats.credits,
        charCount: stats.charCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get SMS Gateway Configuration & Footer Settings
// @route   GET /api/sms/config
export const getSmsConfig = async (req, res, next) => {
  try {
    const isConfigured = Boolean(
      process.env.SMS_API_KEY &&
      process.env.SMS_API_KEY !== 'your_sms_api_key' &&
      process.env.SMS_API_KEY !== 'your_automas_api_key_here'
    );

    const [smsFooter, appendSmsFooter, customSenderId] = await Promise.all([
      Setting.get('smsFooter', 'ChapaiMango.bd'),
      Setting.get('appendSmsFooter', true),
      Setting.get('smsSenderId', process.env.SMS_SENDER_ID || '8809617639998'),
    ]);

    res.status(200).json({
      success: true,
      data: {
        gateway: 'SMS Gateway',
        senderId: customSenderId || process.env.SMS_SENDER_ID || '8809617639998',
        isConfigured,
        hasApiKey: Boolean(process.env.SMS_API_KEY),
        smsFooter,
        appendSmsFooter,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update SMS Configuration & Footer Settings
// @route   PUT /api/sms/config
export const updateSmsConfig = async (req, res, next) => {
  try {
    const { smsFooter, appendSmsFooter, senderId } = req.body;

    if (smsFooter !== undefined) {
      await Setting.set('smsFooter', smsFooter.trim(), 'SMS suffix/signature appended to outgoing messages');
    }

    if (appendSmsFooter !== undefined) {
      await Setting.set('appendSmsFooter', Boolean(appendSmsFooter), 'Whether to automatically append SMS footer');
    }

    if (senderId !== undefined && senderId.trim()) {
      await Setting.set('smsSenderId', senderId.trim(), 'SMS Gateway Sender ID');
    }

    const [updatedFooter, updatedAppend, updatedSenderId] = await Promise.all([
      Setting.get('smsFooter', 'ChapaiMango.bd'),
      Setting.get('appendSmsFooter', true),
      Setting.get('smsSenderId', process.env.SMS_SENDER_ID || '8809617639998'),
    ]);

    await createAuditLog({
      req,
      action: 'SETTINGS_SMS_UPDATE',
      category: 'SETTINGS',
      description: `Updated SMS settings (Footer: "${updatedFooter}", Auto-append: ${updatedAppend}, Sender ID: ${updatedSenderId})`,
      details: {
        smsFooter: updatedFooter,
        appendSmsFooter: updatedAppend,
        senderId: updatedSenderId,
      },
    });

    res.status(200).json({
      success: true,
      message: 'SMS settings updated successfully',
      data: {
        smsFooter: updatedFooter,
        appendSmsFooter: updatedAppend,
        senderId: updatedSenderId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get SMS history
// @route   GET /api/sms/history
export const getSmsHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      SmsLog.find().sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      SmsLog.countDocuments(),
    ]);

    // Enrich logs with recipient names, token costs, and character counts
    const enrichedLogs = logs.map((log) => {
      const logObj = log.toObject ? log.toObject() : { ...log };
      const defaultSenderId = logObj.senderId || process.env.SMS_SENDER_ID || '8809617639998';

      const resolvedTexts = (logObj.resolvedTexts || []).map((r, idx) => {
        const messageText = r.text || logObj.template || '';
        const stats = calculateSmsCredits(messageText);
        const recipientMeta = logObj.recipients?.[idx] || {};
        return {
          name: r.name || recipientMeta.name || 'Customer',
          phone: r.phone || recipientMeta.phone || '',
          text: messageText,
          status: r.status || 'sent',
          charCount: stats.charCount,
          credits: stats.credits,
          isUnicode: stats.isUnicode,
          error: r.error,
        };
      });

      const totalCredits = resolvedTexts.reduce((sum, r) => sum + (r.credits || 1), 0) || 1;

      return {
        ...logObj,
        senderId: defaultSenderId,
        resolvedTexts,
        totalCredits,
      };
    });

    res.status(200).json({
      success: true,
      data: enrichedLogs,
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

// @desc    Preview SMS with resolved template & appended footer
// @route   POST /api/sms/preview
export const previewSms = async (req, res, next) => {
  try {
    const { customerIds, template, limit = 50 } = req.body;

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0 || !template) {
      return res.status(400).json({
        success: false,
        message: 'Customer IDs and template are required',
      });
    }

    const [smsFooter, appendSmsFooter] = await Promise.all([
      Setting.get('smsFooter', 'ChapaiMango.bd'),
      Setting.get('appendSmsFooter', true),
    ]);

    const customers = await Customer.find({
      _id: { $in: customerIds.slice(0, parseInt(limit)) },
    });

    const previews = customers.map((customer) => {
      const text = buildFinalSmsText({
        template,
        customer,
        smsFooter,
        appendSmsFooter,
      });

      const isUnicode = /[^\u0000-\u007F]/.test(text);
      // Accurate multi-part segment thresholds (GSM 03.40 standards)
      let credits = 1;
      if (isUnicode) {
        // Unicode (Bangla): single SMS <= 70, concatenated = 67 chars/part
        credits = text.length <= 70 ? 1 : Math.ceil(text.length / 67);
      } else {
        // English GSM: single SMS <= 160, concatenated = 153 chars/part
        credits = text.length <= 160 ? 1 : Math.ceil(text.length / 153);
      }

      return {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        totalDue: customer.totalDue,
        text,
        charCount: text.length,
        isUnicode,
        credits,
      };
    });

    const totalCredits = previews.reduce((sum, p) => sum + p.credits, 0);

    res.status(200).json({
      success: true,
      data: previews,
      totalRecipients: customerIds.length,
      previewCount: previews.length,
      totalCredits,
      footer: appendSmsFooter ? smsFooter : '',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Automas SMS gateway live account balance / remaining credits
// @route   GET /api/sms/balance
export const getSmsBalance = async (req, res, next) => {
  try {
    const apiKey = process.env.SMS_API_KEY;

    // Simulation / Local dev mode
    if (!apiKey || apiKey === 'your_sms_api_key' || apiKey === 'your_automas_api_key_here') {
      return res.status(200).json({
        success: true,
        data: {
          balance: 2450,
          currency: 'SMS Credits',
          isLive: false,
          gateway: 'SMS Gateway (Simulation)',
        },
      });
    }

    let parsedBalance = null;
    let isLive = true;

    try {
      const response = await axios.get('https://api.automas.com.bd/smsapiv3', {
        params: {
          apikey: apiKey,
          type: 'balance',
        },
        timeout: 8000,
      });

      const raw = response.data;
      if (raw !== undefined && raw !== null) {
        if (typeof raw === 'number') {
          parsedBalance = raw;
        } else if (typeof raw === 'string') {
          const num = parseFloat(raw);
          parsedBalance = !isNaN(num) ? num : raw.trim();
        } else if (typeof raw === 'object') {
          // If gateway returns { response: "xxxx.xx" } or { response: 50 }
          if (typeof raw.response === 'number') {
            parsedBalance = raw.response;
          } else if (typeof raw.response === 'string') {
            const num = parseFloat(raw.response);
            parsedBalance = !isNaN(num) ? num : raw.response.trim();
          } else if (raw.balance !== undefined && !isNaN(parseFloat(raw.balance))) {
            parsedBalance = parseFloat(raw.balance);
          } else if (raw.amount !== undefined && !isNaN(parseFloat(raw.amount))) {
            parsedBalance = parseFloat(raw.amount);
          } else if (raw.credits !== undefined && !isNaN(parseFloat(raw.credits))) {
            parsedBalance = parseFloat(raw.credits);
          }
          // Note: If raw.response is an array or status object (e.g. [{status: 105}]),
          // parsedBalance stays null so an Object is NEVER passed to the frontend!
        }
      }
    } catch (err) {
      console.warn('[SMS BALANCE] Gateway balance check notice:', err.message);
    }

    // Determine clean, primitive balance for UI (guaranteed never an Object)
    const finalBalance =
      typeof parsedBalance === 'number'
        ? parsedBalance
        : typeof parsedBalance === 'string' && parsedBalance.length > 0
        ? parsedBalance
        : 'Active';

    res.status(200).json({
      success: true,
      data: {
        balance: finalBalance,
        currency: typeof finalBalance === 'number' ? 'SMS Credits' : 'Credits',
        isLive,
        gateway: 'SMS Gateway',
      },
    });
  } catch (error) {
    next(error);
  }
};


