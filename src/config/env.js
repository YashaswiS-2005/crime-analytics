import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

function numberFromEnv(name, fallback) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function requiredSecret(name) {
  const value = process.env[name];
  if (value) return value;

  if (nodeEnv === 'production') {
    throw new Error(`${name} must be configured in production.`);
  }

  console.warn(`${name} is not configured. Using an ephemeral development secret.`);
  return crypto.randomBytes(48).toString('hex');
}

function parseCorsOrigins(value) {
  if (!value || value === '*') return true;
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const config = Object.freeze({
  PORT: numberFromEnv('PORT', 3000),
  NODE_ENV: nodeEnv,
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || '',
  MONGODB_DB: process.env.MONGODB_DB || 'crime_analytics',
  JWT_SECRET: requiredSecret('JWT_SECRET'),
  JWT_REFRESH_SECRET: requiredSecret('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  SESSION_TTL_MS: numberFromEnv('SESSION_TTL_MS', 1000 * 60 * 60 * 8),
  RATE_LIMIT_MAX: numberFromEnv('RATE_LIMIT_MAX', 120),
  RATE_LIMIT_WINDOW_MS: numberFromEnv('RATE_LIMIT_WINDOW_MS', 1000 * 60),
  CORS_ORIGIN: parseCorsOrigins(process.env.CORS_ORIGIN),
  DATA_PATH: process.env.DATA_PATH || 'data.json',
  MODEL_PATH: process.env.MODEL_PATH || 'model.json',
  DEFAULT_DATASET_DIR:
    process.env.DATASET_DIR || 'Predictive Crime Analytics-20240328T133800Z-002/Predictive Crime Analytics',
});

export default config;
