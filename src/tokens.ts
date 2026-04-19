import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function generateRefreshToken(): string {
  return uuidv4();
}

export function signAccessToken(payload: { sub: string; username: string }): string {
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: '15m' });
}

export function verifyAccessToken(token: string): { sub: string; username: string } {
  const decoded = jwt.verify(token, JWT_SECRET);
  return decoded as { sub: string; username: string };
}
