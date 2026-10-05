import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { Transaction, UniqueConstraintError } from 'sequelize';
import User from '../db/models/user';
import RefreshToken from '../db/models/refreshToken';
import sequelize from '../db/models/sequelize';
import { jwtSecret } from '../middlewares/auth.middleware';

export const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
export function authError(message: string, statusCode: number) { return Object.assign(new Error(message), { statusCode }); }
export function publicUser(user: User) { return { id: user.id, name: user.name, email: user.email, role: user.role }; }
export function tokenHash(raw: string) { return createHash('sha256').update(raw).digest('hex'); }
export function accessToken(user: User) {
  return jwt.sign({ userId: user.id, email: user.email, role: user.role }, jwtSecret(), {
    algorithm: 'HS256', expiresIn: '15m', issuer: 'restivio-auth', audience: 'restivio',
  });
}
async function session(user: User, transaction?: Transaction) {
  const refreshToken = randomBytes(48).toString('base64url');
  await RefreshToken.create({ tokenHash: tokenHash(refreshToken), userId: user.id,
    expiresAt: new Date(Date.now() + REFRESH_MAX_AGE) }, { transaction });
  return { accessToken: accessToken(user), user: publicUser(user), refreshToken };
}
export async function register(data: { name: string; email: string; password: string }) {
  try {
    const user = await User.create({ name: data.name, email: data.email,
      passwordHash: await bcrypt.hash(data.password, 12), role: 'USER' });
    return publicUser(user);
  } catch (error) {
    if (error instanceof UniqueConstraintError) throw authError('Email already registered', 409);
    throw error;
  }
}
export async function login(email: string, password: string) {
  const user = await User.findOne({ where: { email } });
  if (!user || !await bcrypt.compare(password, user.passwordHash)) throw authError('Invalid email or password', 401);
  return session(user);
}
export async function refresh(raw: string) {
  if (!raw) throw authError('Refresh cookie required', 401);
  return sequelize.transaction(async transaction => {
    // Serialize competing rotations: only one request may consume the old token.
    const token = await RefreshToken.findByPk(tokenHash(raw), { transaction, lock: transaction.LOCK.UPDATE });
    if (!token || token.revokedAt || token.expiresAt.getTime() <= Date.now()) throw authError('Invalid refresh token', 401);
    const user = await User.findByPk(token.userId, { transaction });
    if (!user) throw authError('User not found', 401);
    await token.update({ revokedAt: new Date() }, { transaction });
    return session(user, transaction);
  });
}
export async function logout(raw: string) {
  if (raw) await RefreshToken.update({ revokedAt: new Date() }, { where: { tokenHash: tokenHash(raw), revokedAt: null } });
}
