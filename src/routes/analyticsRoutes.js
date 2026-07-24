import express from 'express';
import { hotspots, trends } from '../controllers/analyticsController.js';

const router = express.Router();

router.get('/trends', trends);
router.get('/hotspots', hotspots);

export default router;
