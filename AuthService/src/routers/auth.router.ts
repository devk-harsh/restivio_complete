import { Router, Response, CookieOptions, RequestHandler } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware';
import * as auth from '../services/auth.service';
import User from '../db/models/user';

const router = Router();
const password = z.string().min(10).max(72).refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Password must fit in 72 UTF-8 bytes');
const credentials = z.object({ email: z.string().trim().toLowerCase().email().max(254), password }).strict();
const registration = credentials.extend({ name: z.string().trim().min(1).max(100) });
const cookie: CookieOptions = { httpOnly: true, sameSite: 'strict', secure: process.env.COOKIE_SECURE === 'true', path: '/api/v1/auth' };

function sendSession(res: Response, result: Awaited<ReturnType<typeof auth.login>>) {
  res.cookie('restivio_refresh', result.refreshToken, { ...cookie, maxAge: auth.REFRESH_MAX_AGE });
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, data: { accessToken: result.accessToken, expiresIn: 900, user: result.user } });
}
// Cookies are same-site; reject explicit cross-origin browser writes as an additional CSRF guard.
const sameOrigin: RequestHandler = (req, res, next) => {
  const origin = req.get('origin');
  const allowedOrigins = [process.env.AUTH_ORIGIN || 'http://localhost:3000', process.env.FRONTEND_ORIGIN || 'http://localhost:5173'];
  if (origin && !allowedOrigins.includes(origin)) {
    res.status(403).json({ success: false, message: 'Origin is not allowed' }); return;
  }
  next();
};
router.use(sameOrigin);
router.post('/register', async (req, res) => { res.status(201).json({ success: true, data: await auth.register(registration.parse(req.body)) }); });
router.post('/login', async (req, res) => {
  const data = credentials.parse(req.body);
  sendSession(res, await auth.login(data.email, data.password));
});
router.post('/refresh', async (req, res) => sendSession(res, await auth.refresh(req.cookies.restivio_refresh || '')));
router.post('/logout', async (req, res) => {
  await auth.logout(req.cookies.restivio_refresh || '');
  res.clearCookie('restivio_refresh', cookie).status(204).end();
});
router.get('/me', authenticate, async (_req, res) => {
  const user = await User.findByPk(res.locals.user.userId);
  if (!user) throw auth.authError('User not found', 401);
  res.json({ success: true, data: auth.publicUser(user) });
});
export default router;
