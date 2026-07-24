import config from '../config/env.js';

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function notFound(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
}

export default function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || error.status || (error.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  const message = error.code === 'LIMIT_FILE_SIZE' ? 'CSV exceeds the configured upload limit.' : error.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: error.code || 'INTERNAL_ERROR',
      statusCode,
    },
    ...(config.NODE_ENV === 'production' ? {} : { stack: error.stack }),
  });
}
