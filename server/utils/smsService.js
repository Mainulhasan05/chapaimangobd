import axios from 'axios';

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

// Helper to format Bangladesh phone number
export const formatMsisdn = (phone) => {
  if (!phone) return '';
  let cleaned = phone.toString().replace(/[^0-9]/g, '');

  if (cleaned.startsWith('880')) {
    return cleaned; // e.g. 8801712345678
  }
  if (cleaned.startsWith('88') && cleaned.length > 11) {
    return cleaned.substring(2);
  }
  if (cleaned.length === 10 && cleaned.startsWith('1')) {
    cleaned = '0' + cleaned;
  }
  if (cleaned.length === 11 && cleaned.startsWith('01')) {
    // Automas accepts 8801XXXXXXXXX or 01XXXXXXXXX; prefix with 880 for standard delivery
    return `88${cleaned}`;
  }
  return cleaned;
};

/**
 * Send a single SMS via Automas API
 * @param {Object} params
 * @param {string} params.to - Recipient phone number
 * @param {string} params.message - SMS content
 * @returns {Promise<{success: boolean, response: any, error?: string}>}
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

  // If no API key configured (development mode simulation)
  if (!apiKey || apiKey === 'your_sms_api_key' || apiKey === 'your_automas_api_key_here') {
    console.log(`[AUTOMAS SIMULATION] To: ${msisdn} | Sender: ${senderId} | SMS: "${message}"`);
    return {
      success: true,
      simulation: true,
      response: { status: 'SIMULATED_SUCCESS', msisdn, message },
    };
  }

  const unicode = isUnicode(message);

  const queryParams = {
    apikey: apiKey,
    sender: senderId,
    msisdn: msisdn,
    smstext: message,
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

    console.log(`[AUTOMAS SUCCESS] Sent to ${msisdn}:`, response.data);

    return {
      success: true,
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
      return {
        success: true,
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
