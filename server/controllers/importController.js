import XLSX from 'xlsx';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import { createAuditLog } from '../utils/auditLogger.js';

/**
 * Normalize a header string for flexible matching.
 * Strips whitespace, lowercases, and removes special chars.
 */
const normalize = (str) =>
  (str || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/**
 * Known header aliases → canonical field name.
 * Covers the user's exact Excel headers + common variants.
 */
const HEADER_MAP = {
  // Date
  date: 'date',
  orderdate: 'date',
  dt: 'date',

  // Serial
  sn: 'serial',
  sl: 'serial',
  slno: 'serial',
  serial: 'serial',
  serialno: 'serial',
  no: 'serial',

  // Customer name
  name: 'customerName',
  customername: 'customerName',
  customer: 'customerName',
  buyername: 'customerName',
  buyer: 'customerName',

  // Reference / referred by
  ref: 'reference',
  reference: 'reference',
  referredby: 'reference',
  fb: 'reference',

  // Phone (multiple possible columns)
  phone: 'phone',
  phonenumber: 'phone',
  mobile: 'phone',
  mobileno: 'phone',
  contact: 'phone',
  contactno: 'phone',
  cell: 'phone',

  // Courier
  courier: 'courier',
  couriername: 'courier',
  delivery: 'courier',
  deliverypartner: 'courier',

  // Product / Mango name
  mangoname: 'productName',
  productname: 'productName',
  product: 'productName',
  item: 'productName',
  itemname: 'productName',
  mango: 'productName',

  // Address
  address: 'address',
  deliveryaddress: 'address',
  shippingaddress: 'address',
  location: 'address',

  // Quantity
  quantity: 'quantity',
  qty: 'quantity',
  pcs: 'quantity',
  kg: 'quantity',

  // Rate
  rate: 'rate',
  price: 'rate',
  unitprice: 'rate',
  unitrate: 'rate',

  // Discount
  discount: 'discount',
  disc: 'discount',
  dis: 'discount',

  // Total
  total: 'total',
  totalbill: 'total',
  totalamount: 'total',
  amount: 'total',
  bill: 'total',
  grandtotal: 'total',

  // Paid
  paidamount: 'paid',
  paid: 'paid',
  payment: 'paid',
  received: 'paid',
  amountpaid: 'paid',
  collection: 'paid',

  // Standing Balance / Due (including 'Stnding Balance' without 'a')
  stndingbalance: 'balance',
  standingbalance: 'balance',
  balance: 'balance',
  due: 'balance',
  dueamount: 'balance',
  remaining: 'balance',
  outstanding: 'balance',

  // Confirmed
  y: 'confirmed',
  confirmed: 'confirmed',
  confirm: 'confirmed',
  status: 'confirmed',
};

/**
 * Clean & normalize a Bangladesh phone number string.
 * Restores leading 0 if dropped by Excel (e.g. 1880065390 -> 01880065390)
 * Handles country code +880 or 880.
 */
const cleanPhoneNumber = (raw) => {
  if (!raw) return null;
  let cleaned = raw.toString().replace(/[^0-9]/g, '');

  if (cleaned.startsWith('880')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('88') && cleaned.length > 11) {
    cleaned = cleaned.substring(2);
  }

  // Excel frequently treats phone as integer and removes leading 0
  if (cleaned.length === 10 && cleaned.startsWith('1')) {
    cleaned = '0' + cleaned;
  }

  // Valid BD mobile numbers are 11 digits starting with 01
  if (cleaned.length === 11 && cleaned.startsWith('01')) {
    return cleaned;
  }

  // If at least 10 digits
  if (cleaned.length >= 10) {
    return cleaned;
  }

  return null;
};

/**
 * Auto-detect column mapping from Excel headers and sample row inspection.
 * If header is empty/unrecognized but cells contain phone numbers, map it to 'phone'.
 */
const autoMapColumns = (headers, sampleRows = []) => {
  const mapping = {};
  const unmapped = [];
  const phoneColumns = [];

  headers.forEach((header, idx) => {
    const key = normalize(header);
    const canonical = key ? HEADER_MAP[key] : null;

    if (canonical) {
      if (canonical === 'phone') {
        phoneColumns.push(idx);
      }
      if (!Object.values(mapping).includes(canonical) || canonical === 'phone') {
        mapping[idx] = canonical;
      }
    } else {
      // Check if sample rows in this column contain phone numbers
      let isPhoneColumn = false;
      if (sampleRows.length > 0) {
        let phoneMatchCount = 0;
        for (const row of sampleRows.slice(0, 10)) {
          const cell = (row[idx] || '').toString().trim();
          if (cell) {
            const lines = cell.split(/[\n\r,;/]+/);
            for (const line of lines) {
              const cleaned = cleanPhoneNumber(line);
              if (cleaned) {
                phoneMatchCount++;
                break;
              }
            }
          }
        }
        if (phoneMatchCount >= 1) {
          isPhoneColumn = true;
          phoneColumns.push(idx);
          if (!mapping[idx]) {
            mapping[idx] = 'phone';
          }
        }
      }

      if (!isPhoneColumn) {
        unmapped.push({ index: idx, header: header || `Column ${idx + 1}` });
      }
    }
  });

  return { mapping, unmapped, phoneColumns };
};

/**
 * Extract all phone numbers from a row, across mapped & unmapped columns.
 * Handles cells with multiple numbers (multi-line or separated by commas).
 */
const extractPhones = (row, phoneColumns) => {
  const phones = [];

  // Check explicitly identified phone columns first
  phoneColumns.forEach((idx) => {
    const val = row[idx];
    if (val !== undefined && val !== null) {
      const parts = val.toString().split(/[\n\r,;/]+/);
      parts.forEach((p) => {
        const cleaned = cleanPhoneNumber(p);
        if (cleaned && !phones.includes(cleaned)) {
          phones.push(cleaned);
        }
      });
    }
  });

  // Also scan all cells in the row just in case
  row.forEach((cell, idx) => {
    if (phoneColumns.includes(idx) || cell === undefined || cell === null) return;
    const parts = cell.toString().split(/[\n\r,;/]+/);
    parts.forEach((p) => {
      const cleaned = cleanPhoneNumber(p);
      if (cleaned && !phones.includes(cleaned)) {
        phones.push(cleaned);
      }
    });
  });

  return phones;
};

/**
 * Parse a date from various Excel formats.
 */
const parseDate = (val) => {
  if (!val) return new Date();

  // Excel serial date number
  if (typeof val === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + val * 86400000);
  }

  // Try parsing string date
  const str = val.toString().trim();
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    return parsed;
  }

  // Try DD/MM/YYYY or DD-MM-YYYY format (e.g. 23/6/2026)
  const parts = str.split(/[/\-.]/);
  if (parts.length === 3) {
    const [d, m, y] = parts.map(Number);
    if (y >= 2000 && d <= 31 && m <= 12) {
      return new Date(y, m - 1, d);
    }
    if (d >= 2000 && y <= 31 && m <= 12) {
      return new Date(d, m - 1, y);
    }
  }

  return new Date();
};

// @desc    Parse Excel file and return preview
// @route   POST /api/import/preview
export const previewImport = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel file' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to array of arrays (raw)
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (rawData.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Excel file must have at least a header row and one data row',
      });
    }

    const headers = rawData[0].map((h) => (h || '').toString().trim());
    const dataRows = rawData.slice(1).filter((row) => row.some((cell) => cell !== ''));
    const { mapping, unmapped, phoneColumns } = autoMapColumns(headers, dataRows);

    // Parse first 10 data rows for preview
    const previewRows = [];

    // Track last known date for rows that inherit date from above
    let lastDate = null;

    for (let i = 0; i < Math.min(dataRows.length, 10); i++) {
      const row = dataRows[i];
      const parsed = {};

      Object.entries(mapping).forEach(([idx, field]) => {
        if (field !== 'phone') {
          parsed[field] = row[parseInt(idx)] || '';
        }
      });

      // Handle date inheritance (empty date = same as row above)
      if (parsed.date) {
        lastDate = parsed.date;
      } else {
        parsed.date = lastDate;
      }

      // Extract phones
      parsed.phones = extractPhones(row, phoneColumns);
      parsed.phone = parsed.phones[0] || '';
      parsed.altPhone = parsed.phones[1] || '';

      previewRows.push({
        rowIndex: i + 2, // 1-indexed, +1 for header
        raw: row,
        parsed,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        fileName: req.file.originalname,
        sheetName,
        totalRows: dataRows.length,
        headers,
        mapping,
        unmapped,
        phoneColumns,
        preview: previewRows,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Execute import from Excel
// @route   POST /api/import/execute
export const executeImport = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel file' });
    }

    const customMapping = req.body.mapping ? JSON.parse(req.body.mapping) : null;

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (rawData.length < 2) {
      return res.status(400).json({ success: false, message: 'No data rows found' });
    }

    const headers = rawData[0].map((h) => (h || '').toString().trim());
    const dataRows = rawData.slice(1).filter((row) => row.some((cell) => cell !== ''));
    const { mapping: autoMapping, phoneColumns } = autoMapColumns(headers, dataRows);
    const mapping = customMapping || autoMapping;

    // Generate unique batch ID for this import session
    const importBatchId = `BATCH_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Results tracking
    const results = {
      importBatchId,
      totalRows: dataRows.length,
      customersCreated: 0,
      customersUpdated: 0,
      ordersCreated: 0,
      ordersSkippedDuplicate: 0,
      paymentsCreated: 0,
      errors: [],
      skipped: 0,
    };

    // Customer cache: phone → customer doc
    const customerCache = {};

    // Pre-load existing customers by phone
    const existingCustomers = await Customer.find();
    existingCustomers.forEach((c) => {
      customerCache[c.phone] = c;
    });

    let lastDate = null;

    for (let i = 0; i < dataRows.length; i++) {
      try {
        const row = dataRows[i];
        const rowNum = i + 2;

        // Extract mapped fields
        const parsed = {};
        Object.entries(mapping).forEach(([idx, field]) => {
          if (field !== 'phone') {
            parsed[field] = row[parseInt(idx)];
          }
        });

        // Handle date inheritance
        if (parsed.date) {
          lastDate = parsed.date;
        } else {
          parsed.date = lastDate;
        }

        // Extract phone numbers
        const phones = extractPhones(row, phoneColumns);
        const primaryPhone = phones[0];
        const altPhone = phones[1] || '';

        // Skip rows without a name or phone
        const customerName = (parsed.customerName || '').toString().trim();
        if (!customerName && !primaryPhone) {
          results.skipped++;
          continue;
        }

        // --- Resolve or Create Customer ---
        let customer;
        if (primaryPhone && customerCache[primaryPhone]) {
          customer = customerCache[primaryPhone];
          // Update name/address if empty
          let needsUpdate = false;
          const updates = {};
          if (customerName && !customer.name) {
            updates.name = customerName;
            needsUpdate = true;
          }
          if (parsed.address && !customer.address) {
            updates.address = parsed.address.toString().trim();
            needsUpdate = true;
          }
          if (needsUpdate) {
            await Customer.findByIdAndUpdate(customer._id, updates);
            results.customersUpdated++;
          }
        } else if (primaryPhone) {
          // Create new customer
          const newCustomer = await Customer.create({
            name: customerName || `Customer ${primaryPhone}`,
            phone: primaryPhone,
            altPhone,
            address: (parsed.address || '').toString().trim() || 'N/A',
            notes: parsed.reference ? `Ref: ${parsed.reference}` : '',
            openingBalance: 0,
          });
          customer = newCustomer;
          customerCache[primaryPhone] = newCustomer;
          results.customersCreated++;
        } else {
          // No phone — try to find by name
          const existing = Object.values(customerCache).find(
            (c) => c.name.toLowerCase() === customerName.toLowerCase()
          );
          if (existing) {
            customer = existing;
          } else {
            // Create with a placeholder phone
            const placeholderPhone = `NOPHONE_${Date.now()}_${i}`;
            const newCustomer = await Customer.create({
              name: customerName,
              phone: placeholderPhone,
              address: (parsed.address || '').toString().trim() || 'N/A',
              notes: parsed.reference ? `Ref: ${parsed.reference}` : '',
              openingBalance: 0,
            });
            customer = newCustomer;
            customerCache[placeholderPhone] = newCustomer;
            results.customersCreated++;
          }
        }

        // --- Create Order ---
        const quantity = parseInt(parsed.quantity) || 1;
        const rate = parseFloat(parsed.rate) || 0;
        const discount = parseFloat(parsed.discount) || 0;
        const productName = (parsed.productName || '').toString().trim() || 'Product';

        // Use the total from Excel if available, otherwise calculate
        let totalBill = parseFloat(parsed.total) || 0;
        if (totalBill === 0) {
          totalBill = quantity * rate - discount;
        }

        const paidAmount = parseFloat(parsed.paid) || 0;
        const orderDue = totalBill - paidAmount;

        if (totalBill <= 0 && rate <= 0) {
          // No meaningful order data, skip order creation but still count
          results.skipped++;
          continue;
        }

        const orderDate = parseDate(parsed.date);

        // Deduplication check: Avoid duplicate order creation if row was already imported
        const startOfDay = new Date(orderDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(orderDate);
        endOfDay.setHours(23, 59, 59, 999);

        const existingOrder = await Order.findOne({
          customer: customer._id,
          orderDate: { $gte: startOfDay, $lte: endOfDay },
          totalBill: Math.max(0, totalBill),
          'items.productName': productName,
        });

        if (existingOrder) {
          results.ordersSkippedDuplicate++;
          continue;
        }

        const order = await Order.create({
          customer: customer._id,
          orderDate,
          items: [
            {
              productName,
              quantity,
              rate,
              subtotal: quantity * rate,
            },
          ],
          discount,
          totalBill: Math.max(0, totalBill),
          paidAmount: Math.max(0, paidAmount),
          orderDue: Math.max(0, orderDue),
          courierName: (parsed.courier || '').toString().trim(),
          deliveryAddress: (parsed.address || '').toString().trim() || customer.address,
          status: 'delivered', // Existing data = already processed
          paymentStatus:
            paidAmount <= 0 ? 'unpaid' : paidAmount >= totalBill ? 'paid' : 'partial',
          importBatchId,
        });

        results.ordersCreated++;

        // Update customer aggregates
        await Customer.findByIdAndUpdate(customer._id, {
          $inc: {
            totalPurchases: Math.max(0, totalBill),
            totalPaid: Math.max(0, paidAmount),
            totalDue: Math.max(0, orderDue),
            orderCount: 1,
          },
        });

        // Create payment record if paid
        if (paidAmount > 0) {
          await Payment.create({
            customer: customer._id,
            order: order._id,
            amount: paidAmount,
            method: 'cash',
            note: `Imported from Excel (Row ${rowNum})`,
            importBatchId,
          });
          results.paymentsCreated++;
        }
      } catch (rowError) {
        results.errors.push({
          row: i + 2,
          message: rowError.message,
        });
      }
    }

    await createAuditLog({
      req,
      action: 'IMPORT_EXCEL',
      category: 'IMPORT',
      description: `Excel data import processed: ${results.customersCreated} new customers, ${results.ordersCreated} orders, ${results.paymentsCreated} payments (${results.errors.length} errors)`,
      details: {
        totalRows: results.totalRows,
        customersCreated: results.customersCreated,
        customersUpdated: results.customersUpdated,
        ordersCreated: results.ordersCreated,
        paymentsCreated: results.paymentsCreated,
        errorCount: results.errors.length,
      },
    });

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get import template info
// @route   GET /api/import/template
export const getTemplate = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      requiredColumns: ['Name', 'Phone/Mobile', 'Product/Mango name', 'Rate', 'Total'],
      optionalColumns: [
        'Date', 'S/N', 'Ref', 'Courier', 'Address', 'Quantity',
        'Discount', 'Paid Amount', 'Standing Balance',
      ],
      supportedFormats: ['.xlsx', '.xls', '.csv'],
      notes: [
        'First row must be headers',
        'Column names are auto-detected (case-insensitive)',
        'Multiple phone numbers per cell are supported (separated by newlines)',
        'Empty date cells inherit the date from the row above',
        'Customers are matched by phone number to avoid duplicates',
      ],
    },
  });
};

// @desc    Rollback a mistakenly executed Excel import batch
// @route   POST /api/import/rollback/:batchId
export const rollbackImport = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    if (!batchId) {
      return res.status(400).json({ success: false, message: 'Batch ID is required' });
    }

    const orders = await Order.find({ importBatchId: batchId });
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'No orders found for this import batch' });
    }

    // Reverse customer balance impacts
    for (const ord of orders) {
      await Customer.findByIdAndUpdate(ord.customer, {
        $inc: {
          totalPurchases: -ord.totalBill,
          totalPaid: -ord.paidAmount,
          totalDue: -ord.orderDue,
          orderCount: -1,
        },
      });
    }

    // Delete orders and payments created in this batch
    await Order.deleteMany({ importBatchId: batchId });
    await Payment.deleteMany({ importBatchId: batchId });

    await createAuditLog({
      req,
      action: 'IMPORT_ROLLBACK',
      category: 'IMPORT',
      description: `Rolled back import batch ${batchId}: Deleted ${orders.length} orders and reversed customer balance changes`,
      details: { batchId, ordersCount: orders.length },
    });

    res.status(200).json({
      success: true,
      message: `Batch ${batchId} rolled back successfully. ${orders.length} orders removed and balances reversed.`,
    });
  } catch (error) {
    next(error);
  }
};
