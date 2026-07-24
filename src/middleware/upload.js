import multer from 'multer';
import { AppError } from './errorHandler.js';

const csvMimeTypes = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/plain',
  'application/octet-stream',
]);

export const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    const looksLikeCsv = /\.csv$/i.test(file.originalname || '') || csvMimeTypes.has(file.mimetype);
    if (!looksLikeCsv) return callback(new AppError('Upload a CSV file.', 400, 'INVALID_UPLOAD'));
    return callback(null, true);
  },
});
