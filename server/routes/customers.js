import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  getCustomerLedger,
  recordPayment,
  deleteCustomer,
  uploadBillImage,
  deleteBillImage,
  getBillImageDirect,
  getPublicCustomerBill,
  sendBulkDueReminders,
} from '../controllers/customerController.js';
import { protect } from '../middleware/auth.js';
import { BILLS_UPLOADS_DIR, ensureUploadDirs } from '../utils/fileStorage.js';

const router = express.Router();

// Ensure upload directories exist at initialization
ensureUploadDirs();

// Public routes (NO authentication required)
router.get('/public-bill/:shortCode', getPublicCustomerBill);
router.get('/bill-image/:filename', getBillImageDirect);

// Configure multer for bill image uploads (JPEG, PNG, WEBP, GIF, max 10MB)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDirs();
    cb(null, BILLS_UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `memo-${uniqueSuffix}${ext}`);
  },
});

const uploadImage = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WEBP, etc.) are allowed'), false);
    }
  },
});

// All routes below require authentication
router.use(protect);

router.post('/upload-image', uploadImage.single('image'), uploadBillImage);
router.post('/delete-image', deleteBillImage);
router.post('/send-bulk-reminders', sendBulkDueReminders);
router.route('/').get(getCustomers).post(createCustomer);

// Update and Delete routes supporting both standard methods and POST for cPanel/LiteSpeed compatibility
router.route('/:id').get(getCustomer).put(updateCustomer).delete(deleteCustomer);
router.post('/:id', updateCustomer); // POST endpoint for update to bypass 403 Forbidden on PUT
router.post('/:id/update', updateCustomer); // Alternative POST endpoint for update
router.post('/:id/delete', deleteCustomer); // Alternative POST endpoint for delete

router.get('/:id/ledger', getCustomerLedger);
router.post('/:id/payment', recordPayment);

export default router;
