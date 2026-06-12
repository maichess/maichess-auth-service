import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

// tokens.ts reads JWT_SECRET at import time and throws without it, so set it before the
// dynamic import (top-level await is unavailable under the commonjs target).
let tokens: typeof import('./tokens');

before(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-key';
  tokens = await import('./tokens');
});

test('access token carries the claims and a 15-minute lifetime', () => {
  const token = tokens.signAccessToken({ sub: 'user-1', username: 'alice' });
  const decoded = jwt.decode(token) as { sub: string; username: string; iat: number; exp: number };

  assert.equal(decoded.sub, 'user-1');
  assert.equal(decoded.username, 'alice');
  // exp - iat is the lifetime; must be the documented 15 min (900 s).
  assert.equal(decoded.exp - decoded.iat, 15 * 60);
});

test('verifyAccessToken round-trips a freshly signed token', () => {
  const token = tokens.signAccessToken({ sub: 'user-2', username: 'bob' });
  const claims = tokens.verifyAccessToken(token);

  assert.equal(claims.sub, 'user-2');
  assert.equal(claims.username, 'bob');
});

test('verifyAccessToken rejects a token signed with a different secret', () => {
  const forged = jwt.sign({ sub: 'x', username: 'mallory' }, 'wrong-secret', { algorithm: 'HS256' });
  assert.throws(() => tokens.verifyAccessToken(forged));
});

test('refresh rotation issues a brand-new opaque token each time', () => {
  // Rotation: every refresh mints a fresh refresh token, so two calls never collide.
  const first = tokens.generateRefreshToken();
  const second = tokens.generateRefreshToken();
  assert.notEqual(first, second);
  assert.match(first, /^[0-9a-f-]{36}$/);
});

test('hashToken is deterministic and one-way (never stores the raw token)', () => {
  const raw = 'a-secret-refresh-token';
  const hash = tokens.hashToken(raw);

  assert.equal(hash, tokens.hashToken(raw));
  assert.notEqual(hash, raw);
  assert.match(hash, /^[0-9a-f]{64}$/); // sha256 hex
});
