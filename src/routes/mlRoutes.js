import express from 'express';
import { modelStatus, predict, trainModel } from '../controllers/mlController.js';

const router = express.Router();

router.get('/status', modelStatus);
router.post('/train', trainModel);
router.post('/predict', predict);

export default router;
