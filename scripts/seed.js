import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import csv from 'csv-parser';
import config from '../src/config/env.js';
import { connectDatabase, disconnectDatabase, isMongoReady } from '../src/config/database.js';
import User from '../src/models/User.js';
import { createCrime, importFromRows } from '../src/services/crimeService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function defaultDatasetFiles() {
  const datasetDir = path.resolve(projectRoot, config.DEFAULT_DATASET_DIR);
  return ['FIR_Details_Data.csv', 'AccusedData.csv', 'VictimInfoDetails.csv', 'ComplainantDetailsData.csv']
    .map((fileName) => path.join(datasetDir, fileName))
    .filter((filePath) => fs.existsSync(filePath));
}

async function importCsvFile(filePath) {
  const batchSize = 1000;
  let batch = [];
  const totals = { imported: 0, duplicates: 0, rejected: 0, totalRows: 0 };

  async function flush() {
    if (!batch.length) return;
    const result = await importFromRows(batch);
    totals.imported += result.imported;
    totals.duplicates += result.duplicates;
    totals.rejected += result.rejected.length;
    totals.totalRows += result.totalRows;
    batch = [];
  }

  const stream = fs.createReadStream(filePath).pipe(csv());
  for await (const row of stream) {
    batch.push(row);
    if (batch.length >= batchSize) await flush();
  }
  await flush();
  return totals;
}

async function seedAdmin() {
  if (!isMongoReady()) return;
  const existing = await User.findOne({ username: 'admin' });
  if (existing) return;
  await User.create({
    username: 'admin',
    password: process.env.SEED_ADMIN_PASSWORD || 'admin1234',
    email: 'admin@crime.local',
    role: 'Admin',
  });
}

async function seedSamplesWhenEmpty() {
  await createCrime({
    incidentNumber: 'FIR-1001',
    crimeType: 'Vehicle Theft',
    description: 'Motorcycle theft near transit parking.',
    district: 'Bengaluru Urban',
    offence: 'Vehicle Theft',
    incidentDate: new Date('2026-07-01T10:00:00Z'),
    status: 'Open',
    risk: 'High',
    suspect: 'Ravi K',
    vehicle: 'KA-05-MX-2219',
    phone: '9845011278',
    summary: 'Two-wheeler theft with duplicate key access.',
    location: { type: 'Point', coordinates: [77.5946, 12.9716] },
  });
  await createCrime({
    incidentNumber: 'FIR-1002',
    crimeType: 'Burglary',
    description: 'Night burglary at a provision store.',
    district: 'Mysuru',
    offence: 'Burglary',
    incidentDate: new Date('2026-07-10T21:00:00Z'),
    status: 'Closed',
    risk: 'Medium',
    suspect: 'Mahesh N',
    vehicle: 'KA-22-PA-7801',
    phone: '7760992215',
    summary: 'Break-in at a closed store along highway edge.',
    location: { type: 'Point', coordinates: [76.6394, 12.2958] },
  });
}

async function seed() {
  await connectDatabase();
  await seedAdmin();

  const requestedFiles = process.argv.slice(2).map((filePath) => path.resolve(projectRoot, filePath));
  const datasetFiles = requestedFiles.length ? requestedFiles : defaultDatasetFiles();

  if (!datasetFiles.length) {
    await seedSamplesWhenEmpty();
    console.log('No CSV dataset files found. Sample crime records inserted.');
    return;
  }

  for (const filePath of datasetFiles) {
    const totals = await importCsvFile(filePath);
    console.log(
      `${path.basename(filePath)}: imported ${totals.imported}, duplicates ${totals.duplicates}, rejected ${totals.rejected}, rows ${totals.totalRows}.`
    );
  }
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
