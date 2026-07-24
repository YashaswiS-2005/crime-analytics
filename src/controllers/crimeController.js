import {
  analyseFirText,
  answerQuestion,
  createCase,
  createCrime,
  getCaseById,
  getDashboardData,
  getMonitor,
  getStats,
  importFromRows,
  listCrimes,
  previewImport,
  searchCases,
  updateCaseStatus,
} from '../services/crimeService.js';
import { parseCsvBuffer } from '../utils/csv.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

export const getCrimes = asyncHandler(async (req, res) => {
  const result = await listCrimes(req.query);
  res.json(result);
});

export const create = asyncHandler(async (req, res) => {
  const item = await createCrime(req.body);
  res.status(201).json(item);
});

export const importCrimes = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Upload a CSV file.', 400, 'CSV_REQUIRED');
  const rows = await parseCsvBuffer(req.file.buffer);
  const result = await importFromRows(rows);
  res.status(201).json(result);
});

export const importPreview = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Upload a CSV file.', 400, 'CSV_REQUIRED');
  const rows = await parseCsvBuffer(req.file.buffer);
  res.json(previewImport(rows, req.file.originalname));
});

export const dashboardData = asyncHandler(async (req, res) => {
  res.json(await getDashboardData());
});

export const search = asyncHandler(async (req, res) => {
  res.json(await searchCases(req.query));
});

export const createLegacyCase = asyncHandler(async (req, res) => {
  const item = await createCase(req.body);
  res.status(201).json(item);
});

export const caseDetail = asyncHandler(async (req, res) => {
  const item = await getCaseById(req.params.id);
  if (!item) throw new AppError('Case not found', 404, 'CASE_NOT_FOUND');
  res.json(item);
});

export const setCaseStatus = asyncHandler(async (req, res) => {
  const item = await updateCaseStatus(req.params.id, req.body?.status);
  if (!item) throw new AppError('Case not found', 404, 'CASE_NOT_FOUND');
  res.json(item);
});

export const stats = asyncHandler(async (req, res) => {
  res.json(await getStats());
});

export const monitor = asyncHandler(async (req, res) => {
  res.json(await getMonitor());
});

export const assistant = asyncHandler(async (req, res) => {
  res.json(await answerQuestion(req.body?.question));
});

export const firAnalyze = asyncHandler(async (req, res) => {
  res.json(analyseFirText(req.body?.text || ''));
});
