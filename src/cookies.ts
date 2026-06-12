import { Response, CookieOptions } from 'express';

export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// `access_token` is sent to every service (path '/'). `refresh_token` is scoped to the
// web client's auth proxy routes — the only path the browser ever uses to reach this
// service is `/api/auth/*` (`/api/auth/refresh`, `/api/auth/logout`), which forward the
// cookie server-side. Scoping it to `/auth` (the auth-service's own mount path) meant the
// browser never attached it to `/api/auth/refresh`, so every refresh silently 401'd and
// the user was logged out the moment the 15-min access token expired. See CONTRACT_NOTES.md.
export const ACCESS_TOKEN_COOKIE_PATH = '/';
export const REFRESH_TOKEN_COOKIE_PATH = '/api/auth';

export function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  };
}

export function setTokenCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('access_token', accessToken, {
    ...baseCookieOptions(),
    path: ACCESS_TOKEN_COOKIE_PATH,
    maxAge: ACCESS_TOKEN_TTL_MS,
  });
  res.cookie('refresh_token', refreshToken, {
    ...baseCookieOptions(),
    path: REFRESH_TOKEN_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

export function clearTokenCookies(res: Response): void {
  res.clearCookie('access_token', { ...baseCookieOptions(), path: ACCESS_TOKEN_COOKIE_PATH });
  res.clearCookie('refresh_token', { ...baseCookieOptions(), path: REFRESH_TOKEN_COOKIE_PATH });
}
