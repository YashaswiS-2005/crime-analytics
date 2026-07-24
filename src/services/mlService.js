import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import config from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { getAllCases, scanCases, updateAlerts } from './crimeService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const modelPath = path.resolve(projectRoot, config.MODEL_PATH);

let model = null;
let stats = {
  accuracy: 0,
  loss: 0,
  epochs: 0,
  samplesUsed: 0,
  lastTrained: null,
};

function loadModel() {
  try {
    if (!fs.existsSync(modelPath)) return;
    const payload = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    model = payload.model || null;
    stats = { ...stats, ...(payload.stats || {}) };
  } catch (error) {
    console.warn(`Could not load model file: ${error.message}`);
  }
}

function saveModel(nextModel, nextStats) {
  fs.writeFileSync(
    modelPath,
    JSON.stringify(
      {
        model: nextModel,
        stats: nextStats,
        version: '1.0',
      },
      null,
      2
    ),
    'utf8'
  );
}

function offenceWeight(offence = '') {
  const value = offence.toLowerCase();
  if (/murder|robbery|assault|weapon|narcotic/.test(value)) return 0.95;
  if (/cyber|fraud|burglary|theft/.test(value)) return 0.75;
  return value ? 0.45 : 0.15;
}

export function extractFeatures(caseData = {}) {
  return [
    caseData.district ? 0.8 : 0.2,
    offenceWeight(caseData.offence || caseData.crimeType),
    caseData.status === 'Closed' ? 0.2 : caseData.status === 'In progress' ? 0.55 : 0.8,
    caseData.suspect && caseData.suspect !== 'Not provided' ? 0.6 : 0.2,
    caseData.vehicle && !['N/A', 'Not provided'].includes(caseData.vehicle) ? 0.7 : 0.2,
  ];
}

function labelForRisk(risk = 'Medium') {
  if (risk === 'High') return 0.9;
  if (risk === 'Low') return 0.1;
  return 0.5;
}

export function riskRank(risk) {
  return { Low: 1, Medium: 2, High: 3 }[risk] || 0;
}

export function getModelInfo() {
  return {
    isTrained: Boolean(model?.weights?.length),
    stats,
    modelPath,
  };
}

export function predictRisk(caseData = {}) {
  if (!model?.weights?.length) {
    const heuristic = extractFeatures(caseData).reduce((sum, value) => sum + value, 0) / 5;
    const predictedRisk = heuristic > 0.7 ? 'High' : heuristic > 0.35 ? 'Medium' : 'Low';
    return { predictedRisk, riskScore: Math.round(heuristic * 100), confidence: Number(heuristic.toFixed(2)), modelSource: 'heuristic' };
  }

  const weighted = extractFeatures(caseData).reduce((sum, value, index) => sum + value * Number(model.weights[index] || 0), Number(model.bias || 0));
  const score = Math.max(0, Math.min(1, weighted));
  const predictedRisk = score > 0.7 ? 'High' : score > 0.35 ? 'Medium' : 'Low';
  return { predictedRisk, riskScore: Math.round(score * 100), confidence: Number(score.toFixed(2)), modelSource: 'trained' };
}

export async function trainModelOnCases(cases = [], epochs = 50) {
  if (!Array.isArray(cases) || cases.length < 2) {
    throw new AppError('Need at least 2 cases to train the model.', 400, 'INSUFFICIENT_TRAINING_DATA');
  }

  const trainingRows = cases.map((item) => ({
    features: extractFeatures(item),
    label: labelForRisk(item.risk),
  }));

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/mlWorker.js', import.meta.url), {
      workerData: {
        cases: trainingRows,
        epochs: Math.min(1000, Math.max(1, Number(epochs) || 50)),
      },
    });

    worker.once('message', (result) => {
      model = { weights: result.weights, bias: result.bias };
      stats = {
        accuracy: result.accuracy,
        loss: result.loss,
        epochs: result.epochs,
        samplesUsed: cases.length,
        lastTrained: new Date().toISOString(),
      };
      saveModel(model, stats);
      resolve({ success: true, model, stats, message: 'Training completed in worker thread.' });
    });

    worker.once('error', reject);
    worker.once('exit', (code) => {
      if (code !== 0) reject(new Error(`ML worker stopped with exit code ${code}`));
    });
  });
}

export async function trainFromRepository(epochs = 50) {
  const cases = await getAllCases();
  return trainModelOnCases(cases, epochs);
}

export async function scanAlerts() {
  const cases = await getAllCases();
  let autoTrained = false;

  if (!getModelInfo().isTrained && cases.length >= 2) {
    await trainModelOnCases(cases, 50);
    autoTrained = true;
  }

  if (!getModelInfo().isTrained) {
    throw new AppError('AI model is not trained yet. Import or add at least two cases, then run the scan again.', 400, 'MODEL_NOT_TRAINED');
  }

  const scored = cases
    .filter((item) => item?.district && item?.offence)
    .map((item) => {
      const prediction = predictRisk(item);
      return {
        case: item,
        prediction,
        escalation: riskRank(prediction.predictedRisk) - riskRank(item.risk),
      };
    })
    .sort((a, b) => {
      if (riskRank(b.prediction.predictedRisk) !== riskRank(a.prediction.predictedRisk)) {
        return riskRank(b.prediction.predictedRisk) - riskRank(a.prediction.predictedRisk);
      }
      return Number(b.prediction.riskScore || 0) - Number(a.prediction.riskScore || 0);
    });

  const findings = scored.slice(0, 8).map(({ case: item, prediction, escalation }) => ({
    type: escalation > 0 ? 'AI risk escalation' : 'AI priority case',
    severity: prediction.predictedRisk,
    cases: [item.id],
    prediction,
    message: `${item.id}: AI model predicts ${prediction.predictedRisk} risk (${prediction.riskScore}% score, ${Math.round(
      Number(prediction.confidence) * 100
    )}% confidence) for ${item.offence} in ${item.district}.`,
  }));

  const highVolumeRule = scanCases(cases).find((finding) => finding.type === 'High-volume area');
  if (highVolumeRule) {
    findings.push({
      ...highVolumeRule,
      type: 'AI context signal',
      message: `AI context: ${highVolumeRule.message}`,
    });
  }

  updateAlerts(findings.map((finding) => finding.message));

  return {
    scanned: cases.length,
    aiPowered: true,
    autoTrained,
    modelStats: stats,
    findings,
    predictions: scored.slice(0, 25).map(({ case: item, prediction }) => ({
      id: item.id,
      district: item.district,
      offence: item.offence,
      currentRisk: item.risk,
      predictedRisk: prediction.predictedRisk,
      riskScore: prediction.riskScore,
      confidence: prediction.confidence,
    })),
    completedAt: new Date().toISOString(),
  };
}

loadModel();
