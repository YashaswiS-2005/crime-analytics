const fs = require('fs');
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

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

app.get('/api/data', (req, res) => {
  res.json({ districts, cases, hotspots, alerts, timeline });
});

app.get('/api/search', (req, res) => {
  const query = (req.query.q || '').trim().toLowerCase();
  const statusFilter = (req.query.status || '').trim().toLowerCase();
  const riskFilter = (req.query.risk || '').trim().toLowerCase();
  const districtFilter = (req.query.district || '').trim().toLowerCase();

  const results = cases.filter((item) => {
    const haystack = Object.values(item).join(' ').toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesStatus = !statusFilter || item.status?.toLowerCase() === statusFilter;
    const matchesRisk = !riskFilter || item.risk?.toLowerCase() === riskFilter;
    const matchesDistrict = !districtFilter || item.district?.toLowerCase() === districtFilter;
    return matchesQuery && matchesStatus && matchesRisk && matchesDistrict;
  });

  res.json({ query, status: statusFilter, risk: riskFilter, district: districtFilter, results });
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
  writeData();
  res.json(item);
});

app.listen(port, () => {
  console.log(`Crime Analytics backend running at http://localhost:${port}`);
});
