import { getAllCases } from '../services/crimeService.js';
import { getModelInfo, predictRisk, scanAlerts, trainModelOnCases, trainFromRepository } from '../services/mlService.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

export const modelStatus = asyncHandler(async (req, res) => {
  const modelInfo = getModelInfo();
  res.json({
    ...modelInfo,
    message: modelInfo.isTrained
      ? `Model trained on ${modelInfo.stats.samplesUsed} cases with ${modelInfo.stats.accuracy}% accuracy`
      : 'Model not yet trained. Call POST /api/ml/train to train the model.',
  });
});

export const trainModel = asyncHandler(async (req, res) => {
  const epochs = Number(req.body?.epochs || 50);
  const cases = Array.isArray(req.body?.cases) && req.body.cases.length ? req.body.cases : await getAllCases();
  const result = await trainModelOnCases(cases, epochs);
  res.json({
    ...result,
    endpoint: '/api/ml/predict',
    usageExample: {
      method: 'POST',
      url: '/api/ml/predict',
      body: {
        district: 'Bengaluru Urban',
        offence: 'Vehicle theft',
        suspect: 'Ravi K',
        vehicle: 'KA-05-MX-2219',
        status: 'Open',
      },
    },
  });
});

export const predict = asyncHandler(async (req, res) => {
  const caseData = req.body || {};
  if (!caseData.district || !(caseData.offence || caseData.crimeType)) {
    throw new AppError('Case data must include at least: district, offence.', 400, 'INVALID_PREDICTION_INPUT');
  }
  const prediction = predictRisk(caseData);
  res.json({
    caseData,
    prediction,
    modelStats: getModelInfo().stats,
  });
});

export const trainRepositoryModel = asyncHandler(async (req, res) => {
  res.json(await trainFromRepository(Number(req.body?.epochs || 50)));
});

export const alertScan = asyncHandler(async (req, res) => {
  res.json(await scanAlerts());
});
