import { registerUser, loginUser, refreshSession, logoutUser } from '../services/authService.js';
import {
  accessCookieName,
  clearAuthCookies,
  cookieOptions,
  readRefreshToken,
  refreshCookieName,
} from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import config from '../config/env.js';

function setAuthCookies(req, res, result) {
  res.cookie(accessCookieName, result.accessToken, cookieOptions(req, config.SESSION_TTL_MS));
  res.cookie(refreshCookieName, result.refreshToken, cookieOptions(req, 7 * 24 * 60 * 60 * 1000));
}

export const register = asyncHandler(async (req, res) => {
  const result = await registerUser(req.body);
  res.status(201).json(result);
});

export const login = asyncHandler(async (req, res) => {
  const result = await loginUser(req.body);
  setAuthCookies(req, res, result);
  res.json(result);
});

export const refresh = asyncHandler(async (req, res) => {
  const result = await refreshSession(readRefreshToken(req));
  setAuthCookies(req, res, result);
  res.json(result);
});

export const logout = asyncHandler(async (req, res) => {
  await logoutUser(readRefreshToken(req));
  clearAuthCookies(res);
  res.json({ success: true });
});

export const session = asyncHandler(async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  return res.json({
    user: {
      id: req.user.sub,
      username: req.user.username,
      role: req.user.role,
    },
  });
});
