import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import CrimeRecord from '../models/CrimeRecord.js';
import { isMongoReady } from '../config/database.js';
import config from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  canonicalise,
  caseToCrimeRecord,
  crimeRecordToCase,
  csvAliases,
  normaliseCaseRecord,
} from '../utils/csv.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const dataPath = path.resolve(projectRoot, config.DATA_PATH);

const fallbackState = {
  districts: [
    { name: 'Bengaluru Urban', cases: 842, solved: 64, hotspot: 91, growth: 12 },
    { name: 'Mysuru', cases: 316, solved: 71, hotspot: 63, growth: 5 },
  ],
  cases: [
    {
      id: 'CASE-1047',
      district: 'Bengaluru Urban',
      offence: 'Vehicle theft',
      suspect: 'Ravi K',
      vehicle: 'KA-05-MX-2219',
      phone: '9845011278',
      risk: 'High',
      status: 'Open',
      summary: 'Two-wheeler thefts near transit parking with duplicate key access.',
    },
    {
      id: 'CASE-1032',
      district: 'Mysuru',
      offence: 'Chain snatching',
      suspect: 'Imran P',
      vehicle: 'KA-09-HH-4410',
      phone: '9900824411',
      risk: 'Medium',
      status: 'In progress',
      summary: 'Morning incidents targeting pedestrians near market approach roads.',
    },
  ],
  trends: [228, 242, 219, 268, 291, 315, 337, 326, 354, 389, 402, 431],
  hotspots: [
    { district: 'Bengaluru Urban', x: '54%', y: '68%', risk: 'high', score: 91 },
    { district: 'Mysuru', x: '40%', y: '77%', risk: 'medium', score: 63 },
  ],
  alerts: [
    'Vehicle theft rose around Bengaluru metro parking clusters.',
    'Burglary FIRs share a late-night rear shutter entry method.',
  ],
  timeline: [
    { time: '08:20', title: 'FIR registered', text: 'Complainant reported vehicle theft near Majestic parking.' },
    { time: '09:05', title: 'CCTV request', text: 'Camera feeds requested from transit authority and nearby shops.' },
  ],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadFallbackData() {
  try {
    const fileData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    Object.assign(fallbackState, {
      districts: fileData.districts?.length ? fileData.districts : fallbackState.districts,
      cases: fileData.cases?.length ? fileData.cases : fallbackState.cases,
      trends: fileData.trends?.length ? fileData.trends : fallbackState.trends,
      hotspots: fileData.hotspots?.length ? fileData.hotspots : fallbackState.hotspots,
      alerts: fileData.alerts?.length ? fileData.alerts : fallbackState.alerts,
      timeline: fileData.timeline?.length ? fileData.timeline : fallbackState.timeline,
    });
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn(`Could not load data.json fallback: ${error.message}`);
  }
}

function writeFallbackData() {
  fs.writeFileSync(dataPath, JSON.stringify(fallbackState, null, 2), 'utf8');
}

function makeCaseId() {
  const latest = fallbackState.cases.reduce((highest, item) => {
    const suffix = Number(String(item.id || '').match(/(\d+)$/)?.[1]) || 0;
    return Math.max(highest, suffix);
  }, 1000);
  return `CASE-${latest + 1}`;
}

function buildTrends(cases) {
  const now = new Date();
  const buckets = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (11 - index), 1));
    return { key: date.toISOString().slice(0, 7), count: 0 };
  });
  const lookup = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  cases.forEach((item) => {
    const date = new Date(item.date || item.createdAt || item.incidentDate || Date.now());
    const key = Number.isNaN(date.getTime()) ? buckets.at(-1).key : date.toISOString().slice(0, 7);
    if (lookup.has(key)) lookup.get(key).count += 1;
  });

  return buckets.map((bucket) => bucket.count);
}

export function refreshFallbackAnalytics() {
  const groups = fallbackState.cases.reduce((all, item) => {
    const district = item.district || 'Unknown';
    all[district] ||= [];
    all[district].push(item);
    return all;
  }, {});

  fallbackState.districts = Object.entries(groups)
    .map(([name, items]) => ({
      name,
      cases: items.length,
      solved: Math.round((items.filter((item) => item.status === 'Closed').length / items.length) * 100),
      hotspot: Math.round((items.filter((item) => item.risk === 'High').length / items.length) * 70 + Math.min(30, items.length)),
      growth: 0,
    }))
    .sort((a, b) => b.cases - a.cases);

  fallbackState.hotspots = fallbackState.districts.map((item, index) => ({
    district: item.name,
    x: `${18 + ((index * 23) % 66)}%`,
    y: `${20 + ((index * 19) % 62)}%`,
    risk: item.hotspot >= 70 ? 'high' : item.hotspot >= 40 ? 'medium' : 'low',
    score: item.hotspot,
  }));

  fallbackState.trends = buildTrends(fallbackState.cases);
}

loadFallbackData();
refreshFallbackAnalytics();

function buildCrimeFilter(query = {}) {
  const { crimeType, district, status, startDate, endDate, lat, lng, radiusKm = 10 } = query;
  const filter = {};

  if (crimeType) filter.crimeType = { $regex: crimeType, $options: 'i' };
  if (district) filter.district = { $regex: district, $options: 'i' };
  if (status) filter.status = status;
  if (startDate || endDate) {
    filter.incidentDate = {};
    if (startDate) filter.incidentDate.$gte = new Date(startDate);
    if (endDate) filter.incidentDate.$lte = new Date(endDate);
  }
  if (lat !== undefined && lng !== undefined && lat !== '' && lng !== '') {
    filter.location = {
      $near: {
        $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
        $maxDistance: Math.max(1, Number(radiusKm) || 10) * 1000,
      },
    };
  }

  return filter;
}

function legacyCaseMatches(item, query = {}) {
  const search = String(query.q || query.search || '').trim().toLowerCase();
  const statusFilter = String(query.status || '').trim().toLowerCase();
  const riskFilter = String(query.risk || '').trim().toLowerCase();
  const districtFilter = String(query.district || '').trim().toLowerCase();
  const offenceFilter = String(query.offence || query.crimeType || '').trim().toLowerCase();
  const haystack = Object.values(item).join(' ').toLowerCase();

  return (
    (!search || haystack.includes(search)) &&
    (!statusFilter || String(item.status || '').toLowerCase() === statusFilter) &&
    (!riskFilter || String(item.risk || '').toLowerCase() === riskFilter) &&
    (!districtFilter || String(item.district || '').toLowerCase() === districtFilter) &&
    (!offenceFilter || String(item.offence || '').toLowerCase().includes(offenceFilter))
  );
}

export async function getAllCases() {
  if (!isMongoReady()) return clone(fallbackState.cases);
  const records = await CrimeRecord.find({}).sort({ incidentDate: -1 }).limit(5000);
  return records.map(crimeRecordToCase);
}

export async function listCrimes(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));

  if (!isMongoReady()) {
    const filtered = fallbackState.cases.filter((item) => legacyCaseMatches(item, query));
    const items = filtered.slice((page - 1) * limit, page * limit).map(caseToCrimeRecord);
    return { items, total: filtered.length, page, limit };
  }

  const filter = buildCrimeFilter(query);
  const [items, total] = await Promise.all([
    CrimeRecord.find(filter)
      .sort(filter.location ? undefined : { incidentDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    CrimeRecord.countDocuments(filter),
  ]);

  return { items, total, page, limit };
}

export async function createCrime(payload = {}) {
  const record = caseToCrimeRecord({
    ...payload,
    id: payload.incidentNumber || payload.id,
    offence: payload.offence || payload.crimeType,
  });

  if (isMongoReady()) return CrimeRecord.create(record);

  const legacy = crimeRecordToCase(record);
  fallbackState.cases.push({ ...legacy, createdAt: new Date().toISOString() });
  refreshFallbackAnalytics();
  writeFallbackData();
  return record;
}

export async function createCase(payload = {}) {
  const required = ['district', 'offence', 'suspect', 'risk', 'summary'];
  const missing = required.filter((field) => !String(payload[field] || '').trim());
  if (missing.length) throw new AppError(`Missing required fields: ${missing.join(', ')}`, 400, 'VALIDATION_ERROR');

  const item = {
    id: payload.id || makeCaseId(),
    district: String(payload.district).trim(),
    offence: String(payload.offence).trim(),
    suspect: String(payload.suspect).trim(),
    vehicle: String(payload.vehicle || 'N/A').trim(),
    phone: String(payload.phone || 'N/A').trim(),
    risk: ['Low', 'Medium', 'High'].includes(payload.risk) ? payload.risk : 'Medium',
    status: ['Open', 'In progress', 'Closed'].includes(payload.status) ? payload.status : 'Open',
    summary: String(payload.summary).trim(),
    officer: String(payload.officer || 'Not provided').trim(),
    evidenceCount: Number(payload.evidenceCount) || 0,
    witnessCount: Number(payload.witnessCount) || 0,
    createdAt: new Date().toISOString(),
  };

  if (isMongoReady()) {
    const created = await CrimeRecord.create(caseToCrimeRecord(item));
    return crimeRecordToCase(created);
  }

  fallbackState.cases.push(item);
  refreshFallbackAnalytics();
  writeFallbackData();
  return item;
}

export function previewImport(rows, fileName = 'dataset.csv') {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const mapped = headers.map(canonicalise);
  const required = ['id', 'district', 'offence'];
  const missing = required.filter((name) => !csvAliases[name].some((alias) => mapped.includes(canonicalise(alias))));
  const normalised = rows.slice(0, 20).map((row, index) => normaliseCaseRecord(row, index));
  const invalid = normalised.filter((item) => item.error).length;

  return {
    fileName,
    totalRows: rows.length,
    headers,
    missing,
    invalidPreviewRows: invalid,
    preview: normalised.filter((item) => item.record).map((item) => item.record),
  };
}

export async function importFromRows(rows = []) {
  const valid = [];
  const rejected = [];

  rows.forEach((row, index) => {
    const parsed = normaliseCaseRecord(row, index);
    if (parsed.error) rejected.push({ row: index + 2, reason: parsed.error });
    else valid.push(parsed.record);
  });

  let duplicates = 0;
  let imported = 0;

  if (isMongoReady()) {
    const ids = valid.map((item) => item.id);
    const existingIds = new Set(await CrimeRecord.distinct('incidentNumber', { incidentNumber: { $in: ids } }));
    const fresh = valid.filter((item) => {
      if (existingIds.has(item.id)) {
        duplicates += 1;
        return false;
      }
      return true;
    });

    if (fresh.length) {
      await CrimeRecord.bulkWrite(
        fresh.map((item) => ({
          insertOne: { document: caseToCrimeRecord(item) },
        })),
        { ordered: false }
      );
    }
    imported = fresh.length;
  } else {
    const seen = new Set(fallbackState.cases.map((item) => item.id));
    const fresh = valid.filter((item) => {
      if (seen.has(item.id)) {
        duplicates += 1;
        return false;
      }
      seen.add(item.id);
      return true;
    });
    fallbackState.cases.push(...fresh);
    imported = fresh.length;
    refreshFallbackAnalytics();
    writeFallbackData();
  }

  return {
    imported,
    duplicates,
    rejected,
    totalRows: rows.length,
    database: isMongoReady() ? 'mongodb' : 'data.json',
    report: {
      highRisk: valid.filter((item) => item.risk === 'High').length,
      solved: valid.filter((item) => item.status === 'Closed').length,
    },
    records: valid,
  };
}

async function mongoDashboardData() {
  const [districts, cases, hotspots, trends] = await Promise.all([
    CrimeRecord.aggregate([
      {
        $group: {
          _id: '$district',
          cases: { $sum: 1 },
          closed: { $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] } },
          highRisk: { $sum: { $cond: [{ $eq: ['$risk', 'High'] }, 1, 0] } },
        },
      },
      { $sort: { cases: -1 } },
    ]),
    CrimeRecord.find({}).sort({ incidentDate: -1 }).limit(500),
    CrimeRecord.aggregate([
      {
        $group: {
          _id: '$district',
          count: { $sum: 1 },
          coordinates: { $first: '$location.coordinates' },
          highRisk: { $sum: { $cond: [{ $eq: ['$risk', 'High'] }, 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 25 },
    ]),
    CrimeRecord.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$incidentDate' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]),
  ]);

  return {
    districts: districts.map((item) => ({
      name: item._id || 'Unknown',
      cases: item.cases,
      solved: item.cases ? Math.round((item.closed / item.cases) * 100) : 0,
      hotspot: item.cases ? Math.round((item.highRisk / item.cases) * 70 + Math.min(30, item.cases)) : 0,
      growth: 0,
    })),
    cases: cases.map(crimeRecordToCase),
    trends: trends.map((item) => item.count),
    hotspots: hotspots.map((item, index) => ({
      district: item._id || 'Unknown',
      x: `${18 + ((index * 23) % 66)}%`,
      y: `${20 + ((index * 19) % 62)}%`,
      risk: item.highRisk > item.count / 2 ? 'high' : item.highRisk ? 'medium' : 'low',
      score: item.count,
      coordinates: item.coordinates,
    })),
    alerts: fallbackState.alerts,
    timeline: fallbackState.timeline,
  };
}

export async function getDashboardData() {
  if (!isMongoReady()) return clone(fallbackState);
  const data = await mongoDashboardData();
  if (!data.cases.length) return clone(fallbackState);
  return data;
}

export async function searchCases(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 25));

  if (!isMongoReady()) {
    const results = fallbackState.cases.filter((item) => legacyCaseMatches(item, query));
    return {
      query: String(query.q || ''),
      total: results.length,
      page,
      limit,
      results: results.slice((page - 1) * limit, page * limit),
    };
  }

  const search = String(query.q || '').trim();
  const filter = {};
  if (search) {
    filter.$or = ['incidentNumber', 'crimeType', 'description', 'district', 'suspect', 'vehicle', 'phone', 'summary'].map((field) => ({
      [field]: { $regex: search, $options: 'i' },
    }));
  }
  if (query.status) filter.status = query.status;
  if (query.risk) filter.risk = query.risk;
  if (query.district) filter.district = { $regex: query.district, $options: 'i' };
  if (query.offence) filter.offence = { $regex: query.offence, $options: 'i' };

  const [records, total] = await Promise.all([
    CrimeRecord.find(filter)
      .sort({ incidentDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    CrimeRecord.countDocuments(filter),
  ]);

  return { query: search, total, page, limit, results: records.map(crimeRecordToCase) };
}

export async function getCaseById(id) {
  if (!isMongoReady()) {
    return fallbackState.cases.find((item) => item.id === id) || null;
  }

  const record = await CrimeRecord.findOne({ incidentNumber: id });
  return record ? crimeRecordToCase(record) : null;
}

export async function updateCaseStatus(id, status) {
  if (!['Open', 'In progress', 'Closed'].includes(status)) {
    throw new AppError('Status must be Open, In progress, or Closed.', 400, 'INVALID_STATUS');
  }

  if (isMongoReady()) {
    const record = await CrimeRecord.findOneAndUpdate({ incidentNumber: id }, { status }, { new: true });
    return record ? crimeRecordToCase(record) : null;
  }

  const item = fallbackState.cases.find((entry) => entry.id === id);
  if (!item) return null;
  item.status = status;
  refreshFallbackAnalytics();
  writeFallbackData();
  return item;
}

export async function getStats() {
  const cases = await getAllCases();
  const today = new Date().toISOString().slice(0, 10);
  const total = cases.length;
  const closed = cases.filter((item) => item.status === 'Closed').length;
  const highRisk = cases.filter((item) => item.risk === 'High').length;

  return {
    total,
    pending: total - closed,
    solved: closed,
    solvedRate: total ? Math.round((closed / total) * 100) : 0,
    highRisk,
    today: cases.filter((item) => String(item.createdAt || '').slice(0, 10) === today).length,
  };
}

export async function getMonitor() {
  const cases = await getAllCases();
  const ordered = [...cases].sort((a, b) => String(b.createdAt || b.date || '').localeCompare(String(a.createdAt || a.date || '')));
  const priority = cases
    .map((item) => ({
      ...item,
      priority: Math.min(
        100,
        (item.risk === 'High' ? 60 : item.risk === 'Medium' ? 30 : 10) +
          (item.status === 'Closed' ? 0 : 25) +
          (!item.evidenceCount ? 10 : 0) +
          (!item.officer || item.officer === 'Not provided' ? 5 : 0)
      ),
    }))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);

  return {
    updatedAt: new Date().toISOString(),
    totals: {
      cases: cases.length,
      open: cases.filter((item) => item.status !== 'Closed').length,
      highRisk: cases.filter((item) => item.risk === 'High').length,
    },
    quality: {
      missingCoordinates: cases.filter((item) => !Number.isFinite(item.latitude) || !Number.isFinite(item.longitude)).length,
      missingOfficer: cases.filter((item) => !item.officer || item.officer === 'Not provided').length,
      missingEvidence: cases.filter((item) => !item.evidenceCount).length,
    },
    priority,
    recent: ordered.slice(0, 5),
  };
}

export async function answerQuestion(questionInput = '') {
  const question = String(questionInput || '').toLowerCase();
  const cases = await getAllCases();
  const topDistrict = Object.entries(
    cases.reduce((all, item) => {
      all[item.district] = (all[item.district] || 0) + 1;
      return all;
    }, {})
  ).sort((a, b) => b[1] - a[1])[0];

  let matching = cases;
  if (question.includes('theft')) matching = cases.filter((item) => item.offence.toLowerCase().includes('theft'));
  if (question.includes('pending')) matching = matching.filter((item) => item.status !== 'Closed');
  if (question.includes('murder')) matching = matching.filter((item) => item.offence.toLowerCase().includes('murder'));

  const reply =
    question.includes('highest') || question.includes('area') || question.includes('hotspot')
      ? topDistrict
        ? `${topDistrict[0]} has the most cases (${topDistrict[1]}) in the loaded data.`
        : 'No cases are loaded.'
      : `I found ${matching.length} matching case${matching.length === 1 ? '' : 's'}${
          matching.length ? `: ${matching.slice(0, 5).map((item) => item.id).join(', ')}.` : '.'
        }`;

  return { reply, cases: matching.slice(0, 10) };
}

export function analyseFirText(text = '') {
  if (!String(text).trim()) throw new AppError('FIR text is required', 400, 'FIR_TEXT_REQUIRED');

  const vehicles = text.match(/[A-Z]{2}-\d{2}-[A-Z]{1,2}-\d{4}/g) || [];
  const phones = text.match(/\b[6-9]\d{9}\b/g) || [];
  const dates = text.match(/\b\d{1,2}\s+[A-Z][a-z]+\s+\d{4}\b/g) || [];
  const names = text.match(/\b[A-Z][a-z]+\s+[A-Z]\b/g) || [];
  const riskTags = [
    text.toLowerCase().includes('duplicate key') ? 'Duplicate-key vehicle theft' : null,
    text.toLowerCase().includes('transit') ? 'Transit hub cluster' : null,
    text.toLowerCase().includes('similar') ? 'Repeat pattern indicated' : null,
    text.toLowerCase().includes('gang') ? 'Organized crime suspected' : null,
    text.toLowerCase().includes('weapon') ? 'Weapon involved' : null,
  ].filter(Boolean);
  const summary = text.split('.').slice(0, 2).join('.').trim();

  return {
    summary: summary ? `${summary}.` : 'No summary could be extracted.',
    people: names.length ? [...new Set(names)].join(', ') : 'No named people detected',
    vehicles: vehicles.length ? vehicles.join(', ') : 'No vehicle registration detected',
    phones: phones.length ? phones.join(', ') : 'No phone numbers detected',
    dates: dates.length ? dates.join(', ') : 'No explicit date detected',
    riskTags: riskTags.length ? riskTags.join(', ') : 'Routine triage',
  };
}

export function scanCases(scope = fallbackState.cases) {
  const findings = [];
  const by = (key) =>
    scope.reduce((groups, item) => {
      const value = String(item[key] || '').trim();
      if (value && value !== 'N/A' && value !== 'Not provided') {
        groups[value] ||= [];
        groups[value].push(item);
      }
      return groups;
    }, {});

  for (const [suspect, items] of Object.entries(by('suspect'))) {
    if (items.length > 1) findings.push({ type: 'Repeat offender', severity: 'High', cases: items.map((item) => item.id), message: `${suspect} is linked to ${items.length} cases.` });
  }
  for (const [phone, items] of Object.entries(by('phone'))) {
    if (items.length > 1) findings.push({ type: 'Shared phone', severity: 'Medium', cases: items.map((item) => item.id), message: `${phone} appears in ${items.length} cases.` });
  }
  for (const [vehicle, items] of Object.entries(by('vehicle'))) {
    if (items.length > 1) findings.push({ type: 'Shared vehicle', severity: 'Medium', cases: items.map((item) => item.id), message: `${vehicle} appears in ${items.length} cases.` });
  }

  const districtGroups = by('district');
  const largest = Object.entries(districtGroups).sort((a, b) => b[1].length - a[1].length)[0];
  if (largest && largest[1].length >= 2) {
    findings.push({ type: 'High-volume area', severity: 'High', cases: largest[1].map((item) => item.id), message: `${largest[0]} has ${largest[1].length} cases in the current dataset.` });
  }

  scope
    .filter((item) => !item.summary || item.summary.length < 10)
    .forEach((item) => findings.push({ type: 'Missing case details', severity: 'Low', cases: [item.id], message: `${item.id} is missing a usable incident summary.` }));

  return findings;
}

export function updateAlerts(messages = []) {
  fallbackState.alerts = messages;
  if (!isMongoReady()) writeFallbackData();
}

export async function getTrends() {
  if (!isMongoReady()) {
    return fallbackState.trends.map((count, index) => ({ monthOffset: index - 11, count }));
  }

  return CrimeRecord.aggregate([
    {
      $group: {
        _id: {
          month: { $dateToString: { format: '%Y-%m', date: '$incidentDate' } },
          district: '$district',
          crimeType: '$crimeType',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.month': 1, count: -1 } },
  ]);
}

export async function getHotspots() {
  if (!isMongoReady()) return clone(fallbackState.hotspots);

  return CrimeRecord.aggregate([
    {
      $group: {
        _id: '$district',
        count: { $sum: 1 },
        highRisk: { $sum: { $cond: [{ $eq: ['$risk', 'High'] }, 1, 0] } },
        coordinates: { $first: '$location.coordinates' },
      },
    },
    {
      $project: {
        district: '$_id',
        _id: 0,
        count: 1,
        highRisk: 1,
        coordinates: 1,
        score: { $add: ['$count', { $multiply: ['$highRisk', 2] }] },
      },
    },
    { $sort: { score: -1 } },
    { $limit: 50 },
  ]);
}
