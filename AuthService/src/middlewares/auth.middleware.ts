import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { timingSafeEqual } from 'crypto';

export type Principal = { userId: number; email: string; role: 'USER' | 'HOTEL_MANAGER' | 'ADMIN' };

export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  return secret;
}

export function verifyAccessToken(token: string): Principal {
  const claims = jwt.verify(token, jwtSecret(), {
    algorithms: ['HS256'], issuer: 'restivio-auth', audience: 'restivio',
  });
  if (typeof claims === 'string' || !Number.isSafeInteger(claims.userId) || claims.userId <= 0 ||
      typeof claims.email !== 'string' || !['USER', 'HOTEL_MANAGER', 'ADMIN'].includes(claims.role)) {
    throw new Error('Invalid access token claims');
  }
  return { userId: claims.userId, email: claims.email, role: claims.role };
}

export const authenticate: RequestHandler = (req, res, next) => {
  const match = req.get('authorization')?.match(/^Bearer (\S+)$/);
  try {
    if (!match) throw new Error('Missing bearer token');
    res.locals.user = verifyAccessToken(match[1]!);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Valid bearer token required' });
  }
};

export const requireRole = (...roles: Principal['role'][]): RequestHandler => (_req, res, next) => {
  const user = res.locals.user as Principal | undefined;
  if (!user) { res.status(401).json({ success: false, message: 'Authentication required' }); return; }
  if (!roles.includes(user.role)) { res.status(403).json({ success: false, message: 'Insufficient role' }); return; }
  next();
};

export const requireInternalKey: RequestHandler = (req, res, next) => {
  const expected = process.env.INTERNAL_SERVICE_KEY;
  const received = req.get('X-Internal-Service-Key') || '';
  if (!expected || Buffer.byteLength(expected) !== Buffer.byteLength(received) ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(received))) {
    res.status(401).json({ success: false, message: 'Internal service credential required' }); return;
  }
  next();
};
