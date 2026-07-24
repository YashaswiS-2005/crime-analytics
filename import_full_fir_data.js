const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');

const sourcePath = path.join(__dirname, 'Predictive Crime Analytics-20240328T133800Z-002', 'Predictive Crime Analytics', 'FIR_Details_Data.csv');
const dataPath = path.join(__dirname, 'data.json');
const maxCasesPerDistrict = Number(process.env.MAX_CASES_PER_DISTRICT || 250);

const aliases = {
  id: ['crimeno', 'firid', 'caseid', 'firno', 'kgid'],
  district: ['district', 'districtname'],
  offence: ['crimetype', 'crimecategory', 'crimegroupname', 'crimeheadname', 'offence'],
  status: ['crimestatus', 'investigationstatus', 'status', 'firstage', 'firstage'],
  risk: ['risklevel', 'risk'],
  date: ['date', 'firdate', 'year', 'firyear'],
  policeStation: ['policestation', 'unitname'],
  latitude: ['latitude', 'lat'],
  longitude: ['longitude', 'lng', 'long'],
  officer: ['officerassigned', 'ioname'],
  severity: ['severity', 'firtype'],
  evidenceCount: ['evidencecount'],
  witnessCount: ['witnesscount'],
};

const canonical = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function pick(row, name) {
  const keysByCanonical = Object.fromEntries(Object.keys(row).map((key) => [canonical(key), key]));
  const key = aliases[name].map((alias) => keysByCanonical[alias]).find(Boolean);
  return key ? String(row[key] || '').trim() : '';
}

function normaliseRecord(row, index) {
  const id = pick(row, 'id');
  const district = pick(row, 'district');
  const offence = pick(row, 'offence');
  if (!id || !district || !offence) return null;

  const statusValue = pick(row, 'status');
  const severity = pick(row, 'severity');
  const risk = pick(row, 'risk') || (/heinous|high|critical/i.test(severity) ? 'High' : 'Medium');

  return {
    id,
    district,
    offence,
    suspect: String(row.Suspect_Name || row.suspect || 'Not provided').trim(),
    vehicle: String(row.Vehicle_Number || row.vehicle || 'Not provided').trim(),
    phone: String(row.Phone_Number || row.phone || 'Not provided').trim(),
    risk,
    status: /closed|solved|disposed|convicted|dis\/acq/i.test(statusValue) ? 'Closed' : 'Open',
    summary: `${offence} reported in ${district}.`,
    date: pick(row, 'date'),
    policeStation: pick(row, 'policeStation'),
    officer: pick(row, 'officer'),
    severity: severity || 'Unknown',
    latitude: Number(pick(row, 'latitude')) || null,
    longitude: Number(pick(row, 'longitude')) || null,
    evidenceCount: Number(pick(row, 'evidenceCount')) || 0,
    witnessCount: Number(pick(row, 'witnessCount')) || 0,
    sourceRow: index + 2,
  };
}

const cases = [];
const districtStats = new Map();
const sampledByDistrict = new Map();
const seen = new Set();
let rowIndex = 0;
let rejected = 0;
let duplicates = 0;

fs.createReadStream(sourcePath)
  .pipe(csvParser())
  .on('data', (row) => {
    const record = normaliseRecord(row, rowIndex);
    rowIndex += 1;
    if (!record) {
      rejected += 1;
      return;
    }
    if (seen.has(record.id)) {
      duplicates += 1;
      return;
    }
    seen.add(record.id);

    const stat = districtStats.get(record.district) || { name: record.district, cases: 0, solvedCount: 0, highRiskCount: 0 };
    stat.cases += 1;
    if (record.status === 'Closed') stat.solvedCount += 1;
    if (record.risk === 'High') stat.highRiskCount += 1;
    districtStats.set(record.district, stat);

    const sampled = sampledByDistrict.get(record.district) || 0;
    if (sampled < maxCasesPerDistrict) {
      cases.push(record);
      sampledByDistrict.set(record.district, sampled + 1);
    }
  })
  .on('end', () => {
    const districts = Array.from(districtStats.values())
      .map((item) => ({
        name: item.name,
        cases: item.cases,
        solved: Math.round((item.solvedCount / item.cases) * 100) || 0,
        hotspot: Math.round((item.highRiskCount / item.cases) * 70 + Math.min(30, item.cases / 100)) || 0,
        growth: 0,
      }))
      .sort((a, b) => b.cases - a.cases);

    const hotspots = districts.map((item, index) => ({
      district: item.name,
      x: `${18 + (index * 23) % 66}%`,
      y: `${20 + (index * 19) % 62}%`,
      risk: item.hotspot >= 70 ? 'high' : item.hotspot >= 40 ? 'medium' : 'low',
      score: item.hotspot,
    }));

    let existing = {};
    if (fs.existsSync(dataPath)) existing = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    fs.writeFileSync(dataPath, JSON.stringify({ ...existing, districts, cases, hotspots }, null, 2), 'utf8');

    console.log(`Read ${rowIndex} FIR rows.`);
    console.log(`Wrote ${cases.length} sampled cases across ${districts.length} districts to data.json.`);
    console.log(`Skipped ${duplicates} duplicate IDs and ${rejected} invalid rows.`);
    console.log(`Top districts: ${districts.slice(0, 8).map((item) => `${item.name} (${item.cases})`).join(', ')}`);
  })
  .on('error', (error) => {
    console.error(error);
    process.exit(1);
  });
