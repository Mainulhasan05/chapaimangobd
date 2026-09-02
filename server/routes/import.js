import express from 'express';
import multer from 'multer';
import { previewImport, executeImport, rollbackImport, getTemplate } from '../controllers/importController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for memory storage (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv',
      'application/octet-stream',
    ];
    if (
      allowed.includes(file.mimetype) ||
      file.originalname.match(/\.(xlsx|xls|csv)$/i)
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are supported'), false);
    }
  },
});

router.use(protect);

router.get('/template', getTemplate);
router.post('/preview', upload.single('file'), previewImport);
router.post('/execute', upload.single('file'), executeImport);
router.post('/rollback/:batchId', rollbackImport);

export default router;
