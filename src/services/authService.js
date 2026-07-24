import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import config from '../config/env.js';
import { isMongoReady } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const usersPath = path.join(projectRoot, 'users.json');
const memoryUsers = new Map();

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function userDto(user) {
  return {
    id: String(user._id || user.id || user.username),
    username: user.username,
    email: user.email || '',
    role: user.role || 'Analyst',
  };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function loadMemoryUsers() {
  if (memoryUsers.size) return;

  try {
    const payload = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    Object.entries(payload.users || {}).forEach(([username, record]) => {
      memoryUsers.set(normalizeUsername(username), {
        username: normalizeUsername(username),
        role: record.role || 'Analyst',
        email: record.email || '',
        ...record,
      });
    });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`Could not load users.json fallback: ${error.message}`);
    }
  }
}

function persistMemoryUsers() {
  const users = Object.fromEntries(memoryUsers);
  fs.writeFileSync(usersPath, JSON.stringify({ users }, null, 2), 'utf8');
}

function verifyLegacyPassword(password, user) {
  if (!user?.salt || !user?.hash) return false;
  const attempt = crypto.pbkdf2Sync(String(password || ''), user.salt, 120000, 32, 'sha256').toString('hex');
  const stored = Buffer.from(user.hash, 'hex');
  const incoming = Buffer.from(attempt, 'hex');
  return stored.length === incoming.length && crypto.timingSafeEqual(stored, incoming);
}

async function verifyMemoryPassword(password, user) {
  if (user?.passwordHash) return bcrypt.compare(String(password || ''), user.passwordHash);
  return verifyLegacyPassword(password, user);
}

function validateCredentials({ username, password, email, role }) {
  const normalizedUsername = normalizeUsername(username);
  if (!/^[a-z0-9._-]{3,32}$/.test(normalizedUsername)) {
    throw new AppError('Username must be 3-32 characters using letters, numbers, dots, dashes, or underscores.', 400, 'INVALID_USERNAME');
  }
  if (String(password || '').length < 8) {
    throw new AppError('Password must be at least 8 characters.', 400, 'INVALID_PASSWORD');
  }
  if (email && !/^\S+@\S+\.\S+$/.test(String(email))) {
    throw new AppError('Email address is invalid.', 400, 'INVALID_EMAIL');
  }
  if (role && !['Admin', 'Analyst', 'Officer'].includes(role)) {
    throw new AppError('Role must be Admin, Analyst, or Officer.', 400, 'INVALID_ROLE');
  }
  return { username: normalizedUsername, password, email, role: role || 'Analyst' };
}

export function signToken(user, type = 'access') {
  const secret = type === 'refresh' ? config.JWT_REFRESH_SECRET : config.JWT_SECRET;
  const expiresIn = type === 'refresh' ? config.JWT_REFRESH_EXPIRES_IN : config.JWT_ACCESS_EXPIRES_IN;
  return jwt.sign(
    {
      sub: String(user._id || user.id || user.username),
      username: user.username,
      role: user.role || 'Analyst',
      tokenType: type,
    },
    secret,
    { expiresIn }
  );
}

async function createSession(user) {
  const accessToken = signToken(user, 'access');
  const refreshToken = signToken(user, 'refresh');
  const decodedRefresh = jwt.decode(refreshToken);
  const refreshRecord = {
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Number(decodedRefresh.exp) * 1000),
  };

  if (isMongoReady()) {
    await User.updateOne(
      { _id: user._id },
      {
        $pull: { refreshTokens: { expiresAt: { $lt: new Date() } } },
        $push: { refreshTokens: refreshRecord },
      }
    );
  } else {
    loadMemoryUsers();
    const stored = memoryUsers.get(user.username);
    if (stored) {
      stored.refreshTokens = (stored.refreshTokens || []).filter((item) => new Date(item.expiresAt) > new Date());
      stored.refreshTokens.push(refreshRecord);
      persistMemoryUsers();
    }
  }

  return { user: userDto(user), accessToken, refreshToken };
}

export async function registerUser(input = {}) {
  const payload = validateCredentials(input);

  if (isMongoReady()) {
    const user = await User.create(payload);
    return createSession(user);
  }

  loadMemoryUsers();
  if (memoryUsers.has(payload.username)) {
    throw new AppError('That username is already registered.', 409, 'USERNAME_EXISTS');
  }

  const user = {
    _id: payload.username,
    username: payload.username,
    email: payload.email || '',
    role: payload.role || 'Analyst',
    passwordHash: await bcrypt.hash(payload.password, 12),
    refreshTokens: [],
    createdAt: new Date().toISOString(),
  };
  memoryUsers.set(payload.username, user);
  persistMemoryUsers();
  return createSession(user);
}

export async function loginUser(input = {}) {
  const username = normalizeUsername(input.username);
  const password = input.password;

  if (isMongoReady()) {
    const user = await User.findOne({ username }).select('+password +refreshTokens');
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError('Invalid username or password.', 401, 'INVALID_CREDENTIALS');
    }
    return createSession(user);
  }

  loadMemoryUsers();
  const user = memoryUsers.get(username);
  if (!user || !(await verifyMemoryPassword(password, user))) {
    throw new AppError('Invalid username or password.', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.passwordHash) {
    user.passwordHash = await bcrypt.hash(String(password), 12);
    delete user.salt;
    delete user.hash;
  }

  return createSession(user);
}

export async function refreshSession(refreshToken) {
  if (!refreshToken) throw new AppError('Refresh token required.', 401, 'REFRESH_REQUIRED');

  let payload;
  try {
    payload = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new AppError('Invalid or expired refresh token.', 401, 'REFRESH_INVALID');
  }

  const tokenHash = hashToken(refreshToken);

  if (isMongoReady()) {
    const user = await User.findOne({ _id: payload.sub, 'refreshTokens.tokenHash': tokenHash }).select('+refreshTokens');
    if (!user) throw new AppError('Refresh token has been revoked.', 401, 'REFRESH_REVOKED');
    await User.updateOne({ _id: user._id }, { $pull: { refreshTokens: { tokenHash } } });
    return createSession(user);
  }

  loadMemoryUsers();
  const user = memoryUsers.get(normalizeUsername(payload.username));
  const hasToken = user?.refreshTokens?.some((item) => item.tokenHash === tokenHash && new Date(item.expiresAt) > new Date());
  if (!hasToken) throw new AppError('Refresh token has been revoked.', 401, 'REFRESH_REVOKED');
  user.refreshTokens = user.refreshTokens.filter((item) => item.tokenHash !== tokenHash);
  return createSession(user);
}

export async function logoutUser(refreshToken) {
  if (!refreshToken) return;
  const tokenHash = hashToken(refreshToken);

  if (isMongoReady()) {
    await User.updateOne({ 'refreshTokens.tokenHash': tokenHash }, { $pull: { refreshTokens: { tokenHash } } });
    return;
  }

  loadMemoryUsers();
  for (const user of memoryUsers.values()) {
    user.refreshTokens = (user.refreshTokens || []).filter((item) => item.tokenHash !== tokenHash);
  }
  persistMemoryUsers();
}
