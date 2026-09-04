import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The server root is one level above utils/
export const SERVER_ROOT = path.resolve(__dirname, '..');
export const UPLOADS_DIR = path.join(SERVER_ROOT, 'uploads');
export const BILLS_UPLOADS_DIR = path.join(UPLOADS_DIR, 'bills');

// Ensure upload directories exist
export const ensureUploadDirs = () => {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    if (!fs.existsSync(BILLS_UPLOADS_DIR)) {
      fs.mkdirSync(BILLS_UPLOADS_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('[fileStorage] Failed to create upload directories:', err);
  }
};

/**
 * Safely deletes a bill image file from server storage
 * @param {string} fileUrlOrName - URL path or filename of the image
 * @returns {Promise<boolean>} - true if file existed and was deleted
 */
export const deleteBillFile = async (fileUrlOrName) => {
  if (!fileUrlOrName || typeof fileUrlOrName !== 'string') return false;

  try {
    // Strip query parameters and extract basename to avoid directory traversal
    const cleanUrl = fileUrlOrName.split('?')[0].split('#')[0];
    const filename = path.basename(cleanUrl);

    if (!filename || filename === '.' || filename === '/' || filename === '\\') {
      return false;
    }

    // List of candidate locations to check
    const candidatePaths = [
      path.join(BILLS_UPLOADS_DIR, filename),
      path.join(UPLOADS_DIR, filename),
      path.join(process.cwd(), 'uploads', 'bills', filename),
      path.join(process.cwd(), 'uploads', filename),
    ];

    let deleted = false;
    for (const filePath of candidatePaths) {
      if (fs.existsSync(filePath)) {
        try {
          await fs.promises.unlink(filePath);
          console.log(`[fileStorage] Deleted image from storage: ${filePath}`);
          deleted = true;
        } catch (unlinkErr) {
          console.error(`[fileStorage] Error unlinking ${filePath}:`, unlinkErr.message);
        }
      }
    }

    return deleted;
  } catch (err) {
    console.error(`[fileStorage] Error deleting bill file ${fileUrlOrName}:`, err.message);
    return false;
  }
};
