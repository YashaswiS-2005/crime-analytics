import express from 'express';
import { create, getCrimes, importCrimes } from '../controllers/crimeController.js';
import { hotspots, trends } from '../controllers/analyticsController.js';
import { uploadCsv } from '../middleware/upload.js';

const router = express.Router();

router.get('/', getCrimes);
router.post('/', create);
router.post('/import', uploadCsv.single('dataset'), importCrimes);

// Backward-compatible aliases from the partial refactor.
router.get('/analytics/trends', trends);
router.get('/analytics/hotspots', hotspots);

export default router;
