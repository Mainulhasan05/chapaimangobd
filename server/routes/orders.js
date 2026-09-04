import express from 'express';
import {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
  addOrderPayment,
  getDailySummary,
} from '../controllers/orderController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getOrders).post(createOrder);
router.get('/daily-summary', getDailySummary);
router.route('/:id').get(getOrder).put(updateOrder).delete(deleteOrder);
router.post('/:id', updateOrder); // POST endpoint for update to bypass 403 Forbidden on PUT
router.post('/:id/update', updateOrder); // Alternative POST endpoint for update
router.post('/:id/delete', deleteOrder); // Alternative POST endpoint for LiteSpeed/cPanel compatibility
router.post('/:id/payment', addOrderPayment);

export default router;
