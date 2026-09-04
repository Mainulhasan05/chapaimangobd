import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  getCustomerLedger,
  recordPayment,
  deleteCustomer,
  uploadBillImage,
  getPublicCustomerBill,
} from '../controllers/customerController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public route: View bill details by short code (NO authentication required)
router.get('/public-bill/:shortCode', getPublicCustomerBill);

// Configure multer for bill image uploads (JPEG, PNG, WEBP, GIF, max 10MB)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads/bills');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
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
router.route('/').get(getCustomers).post(createCustomer);
router.route('/:id').get(getCustomer).put(updateCustomer).delete(deleteCustomer);
router.post('/:id/delete', deleteCustomer); // Alternative POST endpoint for LiteSpeed/cPanel compatibility
router.get('/:id/ledger', getCustomerLedger);
router.post('/:id/payment', recordPayment);

export default router;
