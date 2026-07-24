import fs from 'node:fs';
import { Readable } from 'node:stream';
import csv from 'csv-parser';

export const csvAliases = {
  id: ['incidentNumber', 'crimeno', 'firid', 'caseid', 'firno', 'kgid', 'case_no', 'fir_number'],
  district: ['district', 'districtname'],
  offence: ['crimeType', 'crimecategory', 'crimegroupname', 'crimeheadname', 'offence', 'crime_type'],
  status: ['crimestatus', 'investigationstatus', 'status', 'firstage'],
  risk: ['risklevel', 'risk', 'severitylevel'],
  date: ['date', 'firdate', 'incidentdate', 'year', 'firyear'],
  policeStation: ['policestation', 'unitname', 'psname'],
  latitude: ['latitude', 'lat'],
  longitude: ['longitude', 'lng', 'long'],
  officer: ['officerassigned', 'ioname', 'investigatingofficer'],
  severity: ['severity', 'firtype'],
  evidenceCount: ['evidencecount', 'evidence_count'],
  witnessCount: ['witnesscount', 'witness_count'],
  complainantName: ['complainantname', 'complainant_name', 'complainant'],
  complainantPhone: ['complainantphone', 'complainant_phone'],
  victimName: ['victimname', 'victim_name', 'victim'],
  victimPhone: ['victimphone', 'victim_phone'],
  accusedName: ['accusedname', 'accused_name', 'accused'],
  accusedStatus: ['accusedstatus', 'accused_status'],
  suspect: ['suspect', 'suspectname', 'suspect_name'],
  vehicle: ['vehicle', 'vehiclenumber', 'vehicle_number'],
  phone: ['phone', 'phonenumber', 'phone_number'],
  summary: ['summary', 'description', 'remarks', 'brief_fact'],
};

export async function parseCsvBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];
    Readable.from([buffer])
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

export async function streamCsvFile(filePath, onRow) {
  return new Promise((resolve, reject) => {
    let rowNumber = 0;
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        rowNumber += 1;
        onRow(row, rowNumber);
      })
      .on('end', () => resolve(rowNumber))
      .on('error', reject);
  });
}

export function canonicalise(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function pickValue(row, aliases) {
  const lookup = Object.fromEntries(Object.keys(row || {}).map((key) => [canonicalise(key), key]));
  const match = aliases.map((alias) => lookup[canonicalise(alias)]).find(Boolean);
  return match ? String(row[match] || '').trim() : '';
}

export function pickField(row, name) {
  return pickValue(row, csvAliases[name] || [name]);
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeStatus(value) {
  if (/closed|solved|disposed/i.test(String(value || ''))) return 'Closed';
  if (/progress|investigation|pending/i.test(String(value || ''))) return 'In progress';
  return 'Open';
}

export function normalizeRisk(value, severity = '') {
  const source = `${value || ''} ${severity || ''}`;
  if (/high|critical|severe/i.test(source)) return 'High';
  if (/low|minor/i.test(source)) return 'Low';
  return 'Medium';
}

export function parseIncidentDate(value) {
  if (!value) return new Date();
  if (/^\d{4}$/.test(String(value).trim())) return new Date(`${value}-01-01T00:00:00.000Z`);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function normaliseCaseRecord(row, index = 0) {
  const id = pickField(row, 'id');
  const district = pickField(row, 'district');
  const offence = pickField(row, 'offence');

  if (!id || !district || !offence) {
    return { error: 'FIR/Case ID, District, and Crime Type/Category are required.' };
  }

  const severity = pickField(row, 'severity');
  const latitude = numberOrNull(pickField(row, 'latitude'));
  const longitude = numberOrNull(pickField(row, 'longitude'));
  const suspect = pickField(row, 'suspect') || 'Not provided';
  const vehicle = pickField(row, 'vehicle') || 'Not provided';
  const phone = pickField(row, 'phone') || 'Not provided';
  const summary = pickField(row, 'summary') || `${offence} reported in ${district}.`;

  return {
    record: {
      id,
      district,
      offence,
      suspect,
      vehicle,
      phone,
      risk: normalizeRisk(pickField(row, 'risk'), severity),
      status: normalizeStatus(pickField(row, 'status')),
      summary,
      date: pickField(row, 'date'),
      policeStation: pickField(row, 'policeStation'),
      officer: pickField(row, 'officer') || 'Not provided',
      severity: severity || 'Unknown',
      latitude,
      longitude,
      evidenceCount: Number(pickField(row, 'evidenceCount')) || 0,
      witnessCount: Number(pickField(row, 'witnessCount')) || 0,
      sourceRow: index + 2,
      complainantDetails: {
        name: pickField(row, 'complainantName'),
        phone: pickField(row, 'complainantPhone'),
      },
      victimDetails: {
        name: pickField(row, 'victimName'),
        phone: pickField(row, 'victimPhone'),
      },
      accusedDetails: {
        name: pickField(row, 'accusedName'),
        status: pickField(row, 'accusedStatus'),
      },
    },
  };
}

export function caseToCrimeRecord(caseData) {
  const longitude = Number.isFinite(Number(caseData.longitude)) ? Number(caseData.longitude) : 0;
  const latitude = Number.isFinite(Number(caseData.latitude)) ? Number(caseData.latitude) : 0;

  return {
    incidentNumber: caseData.id || caseData.incidentNumber || `FIR-${Date.now()}`,
    crimeType: caseData.crimeType || caseData.offence || 'Unknown',
    description: caseData.description || caseData.summary || `${caseData.offence || 'Crime'} reported in ${caseData.district || 'Unknown district'}.`,
    district: caseData.district || '',
    offence: caseData.offence || caseData.crimeType || '',
    location: caseData.location || { type: 'Point', coordinates: [longitude, latitude] },
    incidentDate: parseIncidentDate(caseData.incidentDate || caseData.date),
    status: normalizeStatus(caseData.status),
    complainantDetails: caseData.complainantDetails || {},
    victimDetails: caseData.victimDetails || {},
    accusedDetails: caseData.accusedDetails || {},
    risk: normalizeRisk(caseData.risk, caseData.severity),
    suspect: caseData.suspect || '',
    vehicle: caseData.vehicle || '',
    phone: caseData.phone || '',
    summary: caseData.summary || '',
    officer: caseData.officer || '',
    evidenceCount: Number(caseData.evidenceCount) || 0,
    witnessCount: Number(caseData.witnessCount) || 0,
    sourceRow: Number(caseData.sourceRow) || 0,
  };
}

export function crimeRecordToCase(record) {
  const source = typeof record.toJSON === 'function' ? record.toJSON() : record;
  return {
    id: source.incidentNumber || source.id,
    district: source.district || '',
    offence: source.offence || source.crimeType || '',
    suspect: source.suspect || source.accusedDetails?.name || 'Not provided',
    vehicle: source.vehicle || 'Not provided',
    phone: source.phone || source.complainantDetails?.phone || 'Not provided',
    risk: source.risk || 'Medium',
    status: source.status || 'Open',
    summary: source.summary || source.description || '',
    date: source.incidentDate,
    policeStation: source.policeStation || '',
    officer: source.officer || 'Not provided',
    severity: source.severity || 'Unknown',
    latitude: source.location?.coordinates?.[1] ?? null,
    longitude: source.location?.coordinates?.[0] ?? null,
    evidenceCount: source.evidenceCount || 0,
    witnessCount: source.witnessCount || 0,
    createdAt: source.createdAt,
  };
}
