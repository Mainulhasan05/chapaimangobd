import express from 'express';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  getCustomerLedger,
  recordPayment,
  deleteCustomer,
} from '../controllers/customerController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // All customer routes are protected

router.route('/').get(getCustomers).post(createCustomer);
router.route('/:id').get(getCustomer).put(updateCustomer).delete(deleteCustomer);
router.get('/:id/ledger', getCustomerLedger);
router.post('/:id/payment', recordPayment);

export default router;
