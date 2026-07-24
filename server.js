const fs = require('fs');
const express = require('express');
const path = require('path');
const multer = require('multer');
const csvParser = require('csv-parser');
const { Readable } = require('stream');
const { MongoClient } = require('mongodb');
const MLModelTrainer = require('./ml-trainer');

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
let mongoCases;

// Initialize ML Model Trainer
const mlTrainer = new MLModelTrainer();
console.log('[ML] Model trainer initialized');

if (process.env.MONGODB_URI) {
  MongoClient.connect(process.env.MONGODB_URI)
    .then((client) => { mongoCases = client.db(process.env.MONGODB_DB || 'crime_analytics').collection('cases'); console.log('MongoDB connected'); })
    .catch((error) => console.error('MongoDB unavailable; using data.json:', error.message));
}

const districts = [
  { name: 'Bengaluru Urban', cases: 842, solved: 64, hotspot: 91, growth: 12 },
  { name: 'Mysuru', cases: 316, solved: 71, hotspot: 63, growth: 5 },
  { name: 'Mangaluru', cases: 282, solved: 68, hotspot: 59, growth: -2 },
  { name: 'Belagavi', cases: 247, solved: 62, hotspot: 55, growth: 8 },
  { name: 'Hubballi-Dharwad', cases: 231, solved: 66, hotspot: 51, growth: 4 },
  { name: 'Kalaburagi', cases: 196, solved: 58, hotspot: 49, growth: 9 },
];

const cases = [
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
  {
    id: 'CASE-1018',
    district: 'Mangaluru',
    offence: 'Cyber fraud',
    suspect: 'Unknown wallet cluster',
    vehicle: 'N/A',
    phone: '8123459901',
    risk: 'High',
    status: 'Open',
    summary: 'UPI refund scam using rotating bank accounts and mule numbers.',
  },
  {
    id: 'CASE-1009',
    district: 'Belagavi',
    offence: 'Burglary',
    suspect: 'Mahesh N',
    vehicle: 'KA-22-PA-7801',
    phone: '7760992215',
    risk: 'Medium',
    status: 'Closed',
    summary: 'Night break-ins at closed provision stores along highway edge.',
  },
  {
    id: 'CASE-0998',
    district: 'Hubballi-Dharwad',
    offence: 'Robbery',
    suspect: 'Sandeep V',
    vehicle: 'KA-25-QA-1142',
    phone: '9036117844',
    risk: 'High',
    status: 'In progress',
    summary: 'Repeat pattern near cash collection routes after business closing.',
  },
  {
    id: 'CASE-0986',
    district: 'Kalaburagi',
    offence: 'Narcotics',
    suspect: 'Asif R',
    vehicle: 'KA-32-CM-6620',
    phone: '7899921034',
    risk: 'Medium',
    status: 'Open',
    summary: 'Courier-linked peddling route around lodges and bus terminal.',
  },
];

const hotspots = [
  { district: 'Bengaluru Urban', x: '54%', y: '68%', risk: 'high', score: 91 },
  { district: 'Mysuru', x: '40%', y: '77%', risk: 'medium', score: 63 },
  { district: 'Mangaluru', x: '26%', y: '64%', risk: 'medium', score: 59 },
  { district: 'Belagavi', x: '33%', y: '24%', risk: 'medium', score: 55 },
  { district: 'Hubballi-Dharwad', x: '43%', y: '38%', risk: 'low', score: 51 },
  { district: 'Kalaburagi', x: '64%', y: '34%', risk: 'low', score: 49 },
];

const alerts = [
  'Vehicle theft rose 18% around Bengaluru metro parking clusters.',
  'Three burglary FIRs share a late-night rear shutter entry method.',
  'Cyber fraud complaints mention the same beneficiary account fragment.',
  'Robbery incidents peaked within 400m of two cash collection routes.',
];

const timeline = [
  { time: '08:20', title: 'FIR registered', text: 'Complainant reported vehicle theft near Majestic parking.' },
  { time: '09:05', title: 'CCTV request', text: 'Camera feeds requested from transit authority and nearby shops.' },
  { time: '11:40', title: 'Vehicle sighting', text: 'ANPR hit on KA-05-MX-2219 near Tumakuru Road.' },
  { time: '15:10', title: 'Network match', text: 'Phone number overlaps with suspect in CASE-0998.' },
];

const dataPath = path.join(__dirname, 'data.json');
function refreshAnalytics() {
  const groups = cases.reduce((all, item) => { (all[item.district] ||= []).push(item); return all; }, {});
  districts.length = 0;
  const values = Object.entries(groups).map(([name, items]) => ({ name, cases: items.length, solved: Math.round((items.filter((item) => item.status === 'Closed').length / items.length) * 100), hotspot: Math.round((items.filter((item) => item.risk === 'High').length / items.length) * 70 + Math.min(30, items.length)), growth: 0 }));
  districts.push(...values.sort((a, b) => b.cases - a.cases));
  hotspots.length = 0;
  hotspots.push(...districts.map((item, index) => ({ district: item.name, x: `${18 + (index * 23) % 66}%`, y: `${20 + (index * 19) % 62}%`, risk: item.hotspot >= 70 ? 'high' : item.hotspot >= 40 ? 'medium' : 'low', score: item.hotspot })));
}
function writeData() {
  try {
    fs.writeFileSync(dataPath, JSON.stringify({ districts, cases, hotspots, alerts, timeline }, null, 2), 'utf8');
  } catch (writeError) {
    console.warn('Unable to persist data.json:', writeError.message);
  }
}

try {
  const fileData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  if (fileData.districts?.length) {
    districts.length = 0;
    districts.push(...fileData.districts);
  }
  if (fileData.cases?.length) {
    cases.length = 0;
    cases.push(...fileData.cases);
  }
  if (fileData.hotspots?.length) {
    hotspots.length = 0;
    hotspots.push(...fileData.hotspots);
  }
  if (fileData.alerts?.length) {
    alerts.length = 0;
    alerts.push(...fileData.alerts);
  }
  if (fileData.timeline?.length) {
    timeline.length = 0;
    timeline.push(...fileData.timeline);
  }
  console.log('Loaded backend data from data.json');
} catch (error) {
  console.warn('Could not load data.json. Using built-in sample data.', error.message);
}

app.use(express.static(path.join(__dirname)));
app.use(express.json());
app.use('/vendor/papaparse', express.static(path.join(__dirname, 'node_modules', 'papaparse')));

const canonical = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const aliases = { id: ['firid', 'caseid', 'kgid', 'crimeno'], district: ['district', 'districtname'], offence: ['crimetype', 'crimecategory', 'crimegroupname', 'crimeheadname', 'offence'], status: ['crimestatus', 'investigationstatus', 'status', 'firstage'], risk: ['risklevel', 'risk'], date: ['date', 'firdate', 'year', 'firyear'], policeStation: ['policestation', 'unitname'], latitude: ['latitude', 'lat'], longitude: ['longitude', 'lng', 'long'], officer: ['officerassigned', 'ioname'], severity: ['severity'], evidenceCount: ['evidencecount'], witnessCount: ['witnesscount'] };
function pick(row, name) { const keys = Object.keys(row); const key = keys.find((item) => aliases[name].includes(canonical(item))); return key ? String(row[key] || '').trim() : ''; }
function normaliseRecord(row, index) {
  const id = pick(row, 'id'); const district = pick(row, 'district'); const offence = pick(row, 'offence');
  if (!id || !district || !offence) return { error: 'FIR/Case ID, District, and Crime Type/Category are required.' };
  const statusValue = pick(row, 'status'); const severity = pick(row, 'severity');
  return { record: { id, district, offence, suspect: String(row.Suspect_Name || row.suspect || 'Not provided').trim(), vehicle: String(row.Vehicle_Number || row.vehicle || 'Not provided').trim(), phone: String(row.Phone_Number || row.phone || 'Not provided').trim(), risk: pick(row, 'risk') || (/high|critical/i.test(severity) ? 'High' : 'Medium'), status: /closed|solved|disposed/i.test(statusValue) ? 'Closed' : 'Open', summary: `${offence} reported in ${district}.`, date: pick(row, 'date'), policeStation: pick(row, 'policeStation'), officer: pick(row, 'officer'), severity: severity || 'Unknown', latitude: Number(pick(row, 'latitude')) || null, longitude: Number(pick(row, 'longitude')) || null, evidenceCount: Number(pick(row, 'evidenceCount')) || 0, witnessCount: Number(pick(row, 'witnessCount')) || 0, sourceRow: index + 2 } };
}
refreshAnalytics();

function parseCsv(buffer) { return new Promise((resolve, reject) => { const rows = []; Readable.from(buffer).pipe(csvParser()).on('data', (row) => rows.push(row)).on('end', () => resolve(rows)).on('error', reject); }); }

app.post('/api/import/preview', upload.single('dataset'), async (req, res, next) => {
  try {
    if (!req.file || !/\.csv$/i.test(req.file.originalname)) return res.status(400).json({ error: 'Upload a CSV file.' });
    const rows = await parseCsv(req.file.buffer); const headers = rows[0] ? Object.keys(rows[0]) : [];
    const mapped = headers.map(canonical); const required = ['id', 'district', 'offence'];
    const missing = required.filter((name) => !aliases[name].some((alias) => mapped.includes(alias)));
    const normalised = rows.slice(0, 20).map(normaliseRecord); const invalid = normalised.filter((item) => item.error).length;
    res.json({ fileName: req.file.originalname, totalRows: rows.length, headers, missing, invalidPreviewRows: invalid, preview: normalised.filter((item) => item.record).map((item) => item.record) });
  } catch (error) { next(error); }
});

app.get('/api/data', (req, res) => {
  res.json({ districts, cases, hotspots, alerts, timeline });
});

app.get('/api/search', (req, res) => {
  const query = (req.query.q || '').trim().toLowerCase();
  const statusFilter = (req.query.status || '').trim().toLowerCase();
  const riskFilter = (req.query.risk || '').trim().toLowerCase();
  const districtFilter = (req.query.district || '').trim().toLowerCase();
  const offenceFilter = (req.query.offence || '').trim().toLowerCase();
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));

  const results = cases.filter((item) => {
    const haystack = Object.values(item).join(' ').toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesStatus = !statusFilter || item.status?.toLowerCase() === statusFilter;
    const matchesRisk = !riskFilter || item.risk?.toLowerCase() === riskFilter;
    const matchesDistrict = !districtFilter || item.district?.toLowerCase() === districtFilter;
    const matchesOffence = !offenceFilter || item.offence?.toLowerCase() === offenceFilter;
    return matchesQuery && matchesStatus && matchesRisk && matchesDistrict && matchesOffence;
  });

  res.json({ query, status: statusFilter, risk: riskFilter, district: districtFilter, total: results.length, page, limit, results: results.slice((page - 1) * limit, page * limit) });
});

function makeCaseId() {
  const latest = cases.reduce((highest, item) => Math.max(highest, Number((item.id || '').match(/(\d+)$/)?.[1]) || 0), 1000);
  return `CASE-${latest + 1}`;
}

function scanCases(scope = cases) {
  const findings = [];
  const by = (key) => scope.reduce((groups, item) => { const value = String(item[key] || '').trim(); if (value && value !== 'N/A' && value !== 'Not provided') (groups[value] ||= []).push(item); return groups; }, {});
  for (const [suspect, items] of Object.entries(by('suspect'))) if (items.length > 1) findings.push({ type: 'Repeat offender', severity: 'High', cases: items.map((item) => item.id), message: `${suspect} is linked to ${items.length} cases.` });
  for (const [phone, items] of Object.entries(by('phone'))) if (items.length > 1) findings.push({ type: 'Shared phone', severity: 'Medium', cases: items.map((item) => item.id), message: `${phone} appears in ${items.length} cases.` });
  for (const [vehicle, items] of Object.entries(by('vehicle'))) if (items.length > 1) findings.push({ type: 'Shared vehicle', severity: 'Medium', cases: items.map((item) => item.id), message: `${vehicle} appears in ${items.length} cases.` });
  const districtGroups = by('district');
  const largest = Object.entries(districtGroups).sort((a, b) => b[1].length - a[1].length)[0];
  if (largest && largest[1].length >= 2) findings.push({ type: 'High-volume area', severity: 'High', cases: largest[1].map((item) => item.id), message: `${largest[0]} has ${largest[1].length} cases in the current dataset.` });
  scope.filter((item) => !item.summary || item.summary.length < 10).forEach((item) => findings.push({ type: 'Missing case details', severity: 'Low', cases: [item.id], message: `${item.id} is missing a usable incident summary.` }));
  return findings;
}

function riskRank(risk) {
  return { Low: 1, Medium: 2, High: 3 }[risk] || 0;
}

function scanCasesWithModel(scope = cases) {
  const scored = scope
    .filter((item) => item && item.district && item.offence)
    .map((item) => {
      const prediction = mlTrainer.predictCaseRisk(item);
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
    message: `${item.id}: AI model predicts ${prediction.predictedRisk} risk (${prediction.riskScore}% score, ${Math.round(Number(prediction.confidence) * 100)}% confidence) for ${item.offence} in ${item.district}.`,
  }));

  const highVolumeRule = scanCases(scope).find((finding) => finding.type === 'High-volume area');
  if (highVolumeRule) {
    findings.push({
      ...highVolumeRule,
      type: 'AI context signal',
      message: `AI context: ${highVolumeRule.message}`,
    });
  }

  return { findings, scored };
}

app.get('/api/alerts/scan', async (req, res) => {
  try {
    let modelInfo = mlTrainer.getModelInfo();
    let autoTrained = false;

    if (!modelInfo.isTrained && cases.length >= 2) {
      const training = await mlTrainer.trainModel(cases, 50);
      if (training.error) throw new Error(training.error);
      autoTrained = true;
      modelInfo = mlTrainer.getModelInfo();
    }

    if (!modelInfo.isTrained) {
      return res.status(400).json({
        error: 'AI model is not trained yet. Import or add at least two cases, then run the scan again.',
      });
    }

    const { findings, scored } = scanCasesWithModel();
    alerts.length = 0;
    alerts.push(...findings.map((finding) => finding.message));
    writeData();

    res.json({
      scanned: cases.length,
      aiPowered: true,
      autoTrained,
      modelStats: modelInfo.stats,
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
    });
  } catch (error) {
    res.status(500).json({ error: `AI alert scan failed: ${error.message}` });
  }
});

app.post('/api/cases', (req, res) => {
  const body = req.body || {};
  const required = ['district', 'offence', 'suspect', 'risk', 'summary'];
  const missing = required.filter((field) => !String(body[field] || '').trim());
  if (missing.length) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
  const item = { id: makeCaseId(), district: String(body.district).trim(), offence: String(body.offence).trim(), suspect: String(body.suspect).trim(), vehicle: String(body.vehicle || 'N/A').trim(), phone: String(body.phone || 'N/A').trim(), risk: ['Low', 'Medium', 'High'].includes(body.risk) ? body.risk : 'Medium', status: ['Open', 'In progress', 'Closed'].includes(body.status) ? body.status : 'Open', summary: String(body.summary).trim(), createdAt: new Date().toISOString() };
  cases.push(item);
  refreshAnalytics();
  writeData();
  res.status(201).json(item);
});

app.get('/api/stats', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const total = cases.length;
  const closed = cases.filter((item) => item.status === 'Closed').length;
  const highRisk = cases.filter((item) => item.risk === 'High').length;
  res.json({ total, pending: total - closed, solved: closed, solvedRate: total ? Math.round((closed / total) * 100) : 0, highRisk, today: cases.filter((item) => item.createdAt?.slice(0, 10) === today).length });
});

app.get('/api/monitor', (req, res) => {
  const ordered = [...cases].sort((a, b) => String(b.createdAt || b.date || '').localeCompare(String(a.createdAt || a.date || '')));
  const priority = cases.map((item) => ({ ...item, priority: Math.min(100, (item.risk === 'High' ? 60 : item.risk === 'Medium' ? 30 : 10) + (item.status === 'Closed' ? 0 : 25) + (!item.evidenceCount ? 10 : 0) + (!item.officer ? 5 : 0)) })).sort((a, b) => b.priority - a.priority).slice(0, 5);
  const missingCoordinates = cases.filter((item) => !Number.isFinite(item.latitude) || !Number.isFinite(item.longitude)).length;
  const missingOfficer = cases.filter((item) => !item.officer || item.officer === 'Not provided').length;
  const missingEvidence = cases.filter((item) => !item.evidenceCount).length;
  res.json({ updatedAt: new Date().toISOString(), totals: { cases: cases.length, open: cases.filter((item) => item.status !== 'Closed').length, highRisk: cases.filter((item) => item.risk === 'High').length }, quality: { missingCoordinates, missingOfficer, missingEvidence }, priority, recent: ordered.slice(0, 5) });
});

app.post('/api/assistant', (req, res) => {
  const question = String(req.body?.question || '').toLowerCase();
  const topDistrict = Object.entries(cases.reduce((all, item) => { all[item.district] = (all[item.district] || 0) + 1; return all; }, {})).sort((a, b) => b[1] - a[1])[0];
  let matching = cases;
  if (question.includes('theft')) matching = cases.filter((item) => item.offence.toLowerCase().includes('theft'));
  if (question.includes('pending')) matching = matching.filter((item) => item.status !== 'Closed');
  if (question.includes('murder')) matching = matching.filter((item) => item.offence.toLowerCase().includes('murder'));
  const reply = question.includes('highest') || question.includes('area') || question.includes('hotspot')
    ? `${topDistrict ? `${topDistrict[0]} has the most cases (${topDistrict[1]}) in the loaded data.` : 'No cases are loaded.'}`
    : `I found ${matching.length} matching case${matching.length === 1 ? '' : 's'}${matching.length ? `: ${matching.slice(0, 5).map((item) => item.id).join(', ')}.` : '.'}`;
  res.json({ reply, cases: matching.slice(0, 10) });
});

app.get('/api/cases/:id', (req, res) => {
  const caseId = req.params.id;
  const item = cases.find((c) => c.id === caseId);
  if (!item) {
    return res.status(404).json({ error: 'Case not found' });
  }
  res.json(item);
});

app.post('/api/fir/analyze', (req, res) => {
  const text = (req.body && req.body.text) || '';
  if (!text.trim()) {
    return res.status(400).json({ error: 'FIR text is required' });
  }

  const vehicles = text.match(/[A-Z]{2}-\d{2}-[A-Z]{1,2}-\d{4}/g) || [];
  const phones = text.match(/\b[6-9]\d{9}\b/g) || [];
  const dates = text.match(/\b\d{1,2}\s+[A-Z][a-z]+\s+\d{4}\b/g) || [];
  const names = text.match(/\b[A-Z][a-z]+\s+[A-Z]\b/g) || [];
  const riskTags = [
    text.toLowerCase().includes('duplicate key') ? 'Duplicate-key vehicle theft' : null,
    text.toLowerCase().includes('transit') ? 'Transit hub cluster' : null,
    text.toLowerCase().includes('similar') ? 'Repeat pattern indicated' : null,
  ].filter(Boolean);

  const summary = text.split('.').slice(0, 2).join('.').trim();

  res.json({
    summary: summary ? `${summary}.` : 'No summary could be extracted.',
    people: [...new Set(names)].join(', ') || 'No named people detected',
    vehicles: vehicles.join(', ') || 'No vehicle registration detected',
    phones: phones.join(', ') || 'No phone numbers detected',
    dates: dates.join(', ') || 'No explicit date detected',
    riskTags: riskTags.join(', ') || 'Routine triage',
  });
});

app.put('/api/cases/:id/status', (req, res) => {
  const caseId = req.params.id;
  const status = (req.body?.status || '').trim();
  const allowed = ['Open', 'In progress', 'Closed'];

  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
  }

  const item = cases.find((c) => c.id === caseId);
  if (!item) {
    return res.status(404).json({ error: 'Case not found' });
  }

  item.status = status;
  refreshAnalytics();
  writeData();
  res.json(item);
});

// ============ ML MODEL ENDPOINTS ============

// Get model training status and info
app.get('/api/ml/status', (req, res) => {
  const modelInfo = mlTrainer.getModelInfo();
  res.json({
    ...modelInfo,
    message: modelInfo.isTrained 
      ? `Model trained on ${modelInfo.stats.samplesUsed} cases with ${modelInfo.stats.accuracy}% accuracy` 
      : 'Model not yet trained. Call POST /api/ml/train to train the model.',
  });
});

// Train the ML model on case data
app.post('/api/ml/train', async (req, res) => {
  const epochs = parseInt(req.body?.epochs || 50, 10);
  
  if (cases.length < 2) {
    return res.status(400).json({ 
      error: 'Need at least 2 cases to train the model. Import more cases first.' 
    });
  }

  console.log(`[API] Training request: ${cases.length} cases, ${epochs} epochs`);
  
  try {
    const result = await mlTrainer.trainModel(cases, epochs);
    
    if (result.error) {
      return res.status(400).json(result);
    }
    
    res.json({
      success: true,
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Predict risk for a new case using the trained model
app.post('/api/ml/predict', (req, res) => {
  const caseData = req.body;
  
  if (!caseData || !caseData.district || !caseData.offence) {
    return res.status(400).json({ 
      error: 'Case data must include at least: district, offence' 
    });
  }

  const modelInfo = mlTrainer.getModelInfo();
  if (!modelInfo.isTrained) {
    return res.status(400).json({ 
      error: 'Model not trained yet. Train the model first with POST /api/ml/train',
      trainEndpoint: '/api/ml/train',
    });
  }

  const prediction = mlTrainer.predictCaseRisk(caseData);

  res.json({
    caseData: {
      district: caseData.district,
      offence: caseData.offence,
      suspect: caseData.suspect || 'Unknown',
      status: caseData.status || 'Open',
    },
    prediction,
    modelStats: modelInfo.stats,
  });
});

// Auto-train model when importing CSV
app.post('/api/import', upload.single('dataset'), async (req, res, next) => {
  try {
    if (!req.file || !/\.csv$/i.test(req.file.originalname)) return res.status(400).json({ error: 'Upload a CSV file.' });
    const rows = await parseCsv(req.file.buffer); const seen = new Set(cases.map((item) => item.id)); const valid = []; const rejected = []; let duplicates = 0;
    rows.forEach((row, index) => { const parsed = normaliseRecord(row, index); if (parsed.error) rejected.push({ row: index + 2, reason: parsed.error }); else if (seen.has(parsed.record.id)) duplicates += 1; else { seen.add(parsed.record.id); valid.push(parsed.record); } });
    if (mongoCases && valid.length) await mongoCases.bulkWrite(valid.map((document) => ({ updateOne: { filter: { id: document.id }, update: { $set: document }, upsert: true } })));
    cases.push(...valid); refreshAnalytics(); writeData();
    
    // Auto-train model after import if we have enough cases
    if (cases.length >= 2 && !mlTrainer.getModelInfo().isTrained) {
      console.log('[API] Auto-training model after CSV import...');
      const trainResult = await mlTrainer.trainModel(cases, 50);
      if (trainResult.success) {
        console.log('[API] Model auto-trained successfully');
      }
    }
    
    res.status(201).json({ 
      imported: valid.length, 
      duplicates, 
      rejected, 
      totalRows: rows.length, 
      database: mongoCases ? 'mongodb' : 'data.json', 
      report: { 
        highRisk: valid.filter((item) => item.risk === 'High').length, 
        solved: valid.filter((item) => item.status === 'Closed').length 
      },
      mlModel: {
        isTrained: mlTrainer.getModelInfo().isTrained,
        message: 'Model was auto-trained on imported data',
        endpoint: '/api/ml/predict',
      },
    });
  } catch (error) { next(error); }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 500).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'CSV exceeds the 100 MB limit.' : 'The dataset could not be processed.' });
});

app.listen(port, () => {
  console.log(`Crime Analytics backend running at http://localhost:${port}`);
  console.log(`ML Model trainer ready. Call POST /api/ml/train to start training.`);
});
