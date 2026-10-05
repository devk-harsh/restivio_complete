import { ErrorRequestHandler } from 'express';
import logger from '../config/logger.config';
export const appErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  const status = Number(err?.statusCode || err?.status);
  if (!Number.isInteger(status) || status < 400 || status > 599) { next(err); return; }
  res.status(status).json({ success: false, message: status >= 500 ? 'Service temporarily unavailable' : err.message });
};
export const genericErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  logger.error('Unexpected request error', { error: err instanceof Error ? err.message : 'Unknown error' });
  res.status(500).json({ success: false, message: 'Internal Server Error' });
};
