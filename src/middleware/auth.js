import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { AppError } from './errorHandler.js';

export const accessCookieName = 'crime_session';
export const refreshCookieName = 'crime_refresh';

export function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [key, ...value] = part.split('=');
        return [key, decodeURIComponent(value.join('=') || '')];
      })
  );
}

export function readAccessToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
  return parseCookies(req.headers.cookie || '')[accessCookieName] || null;
}

export function readRefreshToken(req) {
  return req.body?.refreshToken || parseCookies(req.headers.cookie || '')[refreshCookieName] || null;
}

export function cookieOptions(req, maxAgeMs) {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https' || config.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure,
    path: '/',
    maxAge: maxAgeMs,
  };
}

export function clearAuthCookies(res) {
  res.clearCookie(accessCookieName, { path: '/' });
  res.clearCookie(refreshCookieName, { path: '/' });
}

export function optionalAuthenticate(req, res, next) {
  const token = readAccessToken(req);
  if (!token) return next();

  try {
    req.user = jwt.verify(token, config.JWT_SECRET);
  } catch (error) {
    req.authError = error;
  }
  return next();
}

export function authenticate(req, res, next) {
  const token = readAccessToken(req);
  if (!token) return next(new AppError('Authentication required.', 401, 'AUTH_REQUIRED'));

  try {
    req.user = jwt.verify(token, config.JWT_SECRET);
    return next();
  } catch (error) {
    return next(new AppError('Invalid or expired token.', 401, 'AUTH_INVALID'));
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new AppError('Insufficient permissions.', 403, 'FORBIDDEN'));
    }
    return next();
  };
}
