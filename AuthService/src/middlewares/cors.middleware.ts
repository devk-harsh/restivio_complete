import { RequestHandler } from 'express';

// Exact origins only. Credentials never accompany a wildcard origin.
export const browserCors: RequestHandler = (req, res, next) => {
  const origin = req.get('origin');
  const allowed = [process.env.FRONTEND_ORIGIN || 'http://localhost:5173'];
  res.vary('Origin');
  if (origin && allowed.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Idempotency-Key, X-Correlation-ID');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.set('Access-Control-Expose-Headers', 'Idempotency-Replayed, X-Correlation-ID');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  }
  next();
};
