import express from 'express';
import {
  sendBulkSms,
  getSmsHistory,
  previewSms,
  sendTestSms,
  getSmsConfig,
  updateSmsConfig,
} from '../controllers/smsController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/config', getSmsConfig);
router.put('/config', updateSmsConfig);
router.post('/test', sendTestSms);
router.post('/send', sendBulkSms);
router.get('/history', getSmsHistory);
router.post('/preview', previewSms);

export default router;

