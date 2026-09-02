import express from 'express';
import { getAuditLogs, getAuditStats } from '../controllers/auditLogController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getAuditLogs);
router.get('/stats', getAuditStats);

export default router;
