import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { CookieOptions, Response } from 'express';
import {
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
  ACCESS_TOKEN_COOKIE_PATH,
  REFRESH_TOKEN_COOKIE_PATH,
  baseCookieOptions,
  setTokenCookies,
  clearTokenCookies,
} from './cookies';

// Minimal Response stub that records cookie()/clearCookie() calls so we can assert the
// exact name/value/options each token cookie is written with — no Express runtime needed.
interface CookieCall {
  name: string;
  value?: string;
  options: CookieOptions;
}

function fakeResponse(): { res: Response; set: CookieCall[]; cleared: CookieCall[] } {
  const set: CookieCall[] = [];
  const cleared: CookieCall[] = [];
  const res = {
    cookie(name: string, value: string, options: CookieOptions) {
      set.push({ name, value, options });
      return res;
    },
    clearCookie(name: string, options: CookieOptions) {
      cleared.push({ name, options });
      return res;
    },
  } as unknown as Response;
  return { res, set, cleared };
}

const COOKIE_ENV = ['NODE_ENV', 'COOKIE_SECURE', 'COOKIE_DOMAIN'] as const;
let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = {};
  for (const key of COOKIE_ENV) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of COOKIE_ENV) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

test('token lifetimes match the documented 15-min / 30-day expiry', () => {
  assert.equal(ACCESS_TOKEN_TTL_MS, 15 * 60 * 1000);
  assert.equal(REFRESH_TOKEN_TTL_MS, 30 * 24 * 60 * 60 * 1000);
});

test('refresh_token is scoped to the /api/auth proxy routes, not /auth', () => {
  // Regression guard for the premature-logout bug: the browser only reaches auth-service
  // through the client's /api/auth/* proxy, so a /auth-scoped cookie is never sent on refresh.
  assert.equal(REFRESH_TOKEN_COOKIE_PATH, '/api/auth');
  assert.equal(ACCESS_TOKEN_COOKIE_PATH, '/');
});

test('setTokenCookies writes both cookies with the right path and maxAge', () => {
  const { res, set } = fakeResponse();

  setTokenCookies(res, 'access-jwt', 'refresh-uuid');

  assert.equal(set.length, 2);
  const access = set.find((c) => c.name === 'access_token');
  const refresh = set.find((c) => c.name === 'refresh_token');
  assert.ok(access && refresh);
  assert.equal(access.value, 'access-jwt');
  assert.equal(access.options.path, '/');
  assert.equal(access.options.maxAge, ACCESS_TOKEN_TTL_MS);
  assert.equal(refresh.value, 'refresh-uuid');
  assert.equal(refresh.options.path, '/api/auth');
  assert.equal(refresh.options.maxAge, REFRESH_TOKEN_TTL_MS);
});

test('clearTokenCookies clears both cookies with matching paths', () => {
  const { res, cleared } = fakeResponse();

  clearTokenCookies(res);

  assert.equal(cleared.length, 2);
  const access = cleared.find((c) => c.name === 'access_token');
  const refresh = cleared.find((c) => c.name === 'refresh_token');
  // Paths must match the set paths or the browser will not delete the cookies.
  assert.equal(access?.options.path, '/');
  assert.equal(refresh?.options.path, '/api/auth');
});

test('cookies are HttpOnly and SameSite=Lax, insecure by default for localhost', () => {
  const options = baseCookieOptions();
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, 'lax');
  assert.equal(options.secure, false);
  assert.equal('domain' in options, false);
});

test('secure cookies are enabled in production', () => {
  process.env.NODE_ENV = 'production';
  assert.equal(baseCookieOptions().secure, true);
});

test('secure cookies are enabled via COOKIE_SECURE override', () => {
  process.env.COOKIE_SECURE = 'true';
  assert.equal(baseCookieOptions().secure, true);
});

test('COOKIE_DOMAIN, when set, scopes cookies to the shared domain', () => {
  process.env.COOKIE_DOMAIN = '.maichess.com';
  assert.equal(baseCookieOptions().domain, '.maichess.com');
});
