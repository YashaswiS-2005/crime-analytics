import express from 'express';
import {
  assistant,
  caseDetail,
  createLegacyCase,
  dashboardData,
  firAnalyze,
  importCrimes,
  importPreview,
  monitor,
  search,
  setCaseStatus,
  stats,
} from '../controllers/crimeController.js';
import { alertScan } from '../controllers/mlController.js';
import { uploadCsv } from '../middleware/upload.js';

const router = express.Router();

router.post('/import/preview', uploadCsv.single('dataset'), importPreview);
router.post('/import', uploadCsv.single('dataset'), importCrimes);
router.get('/data', dashboardData);
router.get('/search', search);
router.get('/alerts/scan', alertScan);
router.post('/cases', createLegacyCase);
router.get('/cases/:id', caseDetail);
router.put('/cases/:id/status', setCaseStatus);
router.get('/stats', stats);
router.get('/monitor', monitor);
router.post('/assistant', assistant);
router.post('/fir/analyze', firAnalyze);

export default router;
