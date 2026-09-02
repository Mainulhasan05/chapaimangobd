import express from 'express';
import { getDashboardStats, getChartData } from '../controllers/dashboardController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/stats', getDashboardStats);
router.get('/chart-data', getChartData);

export default router;
