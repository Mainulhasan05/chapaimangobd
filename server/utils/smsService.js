import axios from 'axios';
import { parsePhone, isSmsCapable } from './phone.js';

/**
 * Automas SMS Gateway Service
 * API Documentation: https://sms.automas.com.bd/api
 * Endpoint: https://api.automas.com.bd/smsapiv3
 */

// Helper to check if string contains Unicode (e.g. Bangla or special characters)
export const isUnicode = (text) => {
  if (!text) return false;
  // If string contains any character with code > 127
  return /[^\u0000-\u007F]/.test(text);
};

// Helper to sanitize SMS text by removing accidental multiple spaces, tabs, and excess blank lines
export const cleanSmsText = (text) => {
  if (!text) return '';
  return text
    .toString()
    .split('\n')
    .map((line) => line.trim().replace(/[ \t]+/g, ' '))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// Converts any stored number into the MSISDN the gateway expects.
// Bangladeshi numbers become 8801XXXXXXXXX; anything else is passed through in
// plain E.164 digits so the caller can decide what to do with it.
export const formatMsisdn = (phone) => {
  const { digits } = parsePhone(phone);
  return digits;
};

export const AUTOMAS_STATUS_MESSAGES = {
  0: 'Success',
  101: 'Invalid Message Length',
  102: 'Sender ID Not Valid / Not Approved',
  103: 'Authentication Failed',
  104: 'Invalid User',
  105: 'Invalid MSISDN (Phone Number)',
  106: 'Incorrect API Key',
  107: 'User Account Suspended',
  108: 'IP Address Not Allowed',
  109: 'API Access Not Allowed',
  110: 'Do Not Disturb (DND) Active',
  111: 'Spam Word Detected in Message',
  1000: 'Insufficient SMS Balance',
  2300: 'Destination Route Issue',
  2400: 'API Access Not Allowed',
  3300: 'System Error',
  2000: 'Destination Provider Unavailable',
  3000: 'Destination Provider Unavailable',
  4000: 'Destination Provider Unavailable',
};

export const parseAutomasResponse = (data) => {
  if (!data) {
    return { success: false, error: 'Empty response from SMS gateway' };
  }

  const respList = Array.isArray(data?.response)
    ? data.response
    : Array.isArray(data)
    ? data
    : null;

  if (respList && respList.length > 0) {
    const item = respList[0];
    const statusCode = Number(item.status);
    if (statusCode === 0) {
      return {
        success: true,
        id: item.id || item.sid,
        msisdn: item.msisdn,
      };
    } else {
      const errorMsg =
        AUTOMAS_STATUS_MESSAGES[statusCode] ||
        `Gateway error (Status code ${statusCode})`;
      return {
        success: false,
        error: errorMsg,
        statusCode,
        id: item.id || item.sid,
      };
    }
  }

  if (typeof data?.response === 'string') {
    return { success: true, message: data.response };
  }

  return { success: true };
};

/**
 * Send a single SMS via Automas API
 * @param {Object} params
 * @param {string} params.to - Recipient phone number
 * @param {string} params.message - SMS content
 * @returns {Promise<{success: boolean, response: any, error?: string, id?: any}>}
 */
export const sendSms = async ({ to, message }) => {
  const apiUrl = process.env.SMS_API_URL || 'https://api.automas.com.bd/smsapiv3';
  const apiKey = process.env.SMS_API_KEY;
  const senderId = process.env.SMS_SENDER_ID || 'HIMEL';

  const msisdn = formatMsisdn(to);

  if (!msisdn) {
    return {
      success: false,
      error: 'Invalid recipient phone number',
    };
  }

  // Automas is a domestic gateway. Reject foreign numbers up front rather than
  // burning an API call and an SMS credit on a guaranteed rejection.
  if (!isSmsCapable(to)) {
    return {
      success: false,
      skipped: true,
      error: 'SMS delivery is available for Bangladeshi numbers only. Reach this customer over WhatsApp instead.',
    };
  }

  const sanitizedMessage = cleanSmsText(message);

  // If no API key configured (development mode simulation)
  if (!apiKey || apiKey === 'your_sms_api_key' || apiKey === 'your_automas_api_key_here') {
    console.log(`[AUTOMAS SIMULATION] To: ${msisdn} | Sender: ${senderId} | SMS: "${sanitizedMessage}"`);
    return {
      success: true,
      simulation: true,
      response: { status: 'SIMULATED_SUCCESS', msisdn, message: sanitizedMessage },
    };
  }

  const unicode = isUnicode(sanitizedMessage);

  const queryParams = {
    apikey: apiKey,
    sender: senderId,
    msisdn: msisdn,
    smstext: sanitizedMessage,
  };

  if (unicode) {
    queryParams.smsformat = '8';
    queryParams.type = 'unicode';
  }

  try {
    // Automas supports both POST and GET
    const response = await axios.post(apiUrl, null, {
      params: queryParams,
      timeout: 15000,
    });

    const parsed = parseAutomasResponse(response.data);
    if (!parsed.success) {
      console.warn(`[AUTOMAS REJECT] Failed for ${msisdn}:`, parsed.error, response.data);
      return {
        success: false,
        error: parsed.error,
        response: response.data,
      };
    }

    console.log(`[AUTOMAS SUCCESS] Sent to ${msisdn}:`, response.data);

    return {
      success: true,
      id: parsed.id,
      response: response.data,
    };
  } catch (err) {
    console.error(`[AUTOMAS ERROR] Failed for ${msisdn}:`, err.response?.data || err.message);

    // Fallback to GET if POST failed with 405 or gateway specific response
    try {
      const getResponse = await axios.get(apiUrl, {
        params: queryParams,
        timeout: 15000,
      });

      const parsed = parseAutomasResponse(getResponse.data);
      if (!parsed.success) {
        return {
          success: false,
          error: parsed.error,
          response: getResponse.data,
        };
      }

      return {
        success: true,
        id: parsed.id,
        response: getResponse.data,
      };
    } catch (fallbackErr) {
      return {
        success: false,
        error: fallbackErr.response?.data?.message || fallbackErr.response?.data || fallbackErr.message,
      };
    }
  }
};

/**
 * Send bulk dynamic SMS (each recipient gets a personalized message)
 * Processes in batches of 5 concurrent requests to avoid server overloading.
 * @param {Array<{customer: string, phone: string, name: string, text: string}>} items
 * @returns {Promise<Array<{phone: string, text: string, status: 'sent'|'failed', error?: string}>>}
 */
export const sendBulkDynamicSms = async (items) => {
  const results = [];
  const chunkSize = 5;

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkPromises = chunk.map(async (item) => {
      const res = await sendSms({ to: item.phone, message: item.text });
      return {
        phone: item.phone,
        text: item.text,
        status: res.success ? 'sent' : 'failed',
        error: res.error,
        response: res.response,
      };
    });

    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
  }

  return results;
};
