# CONTRACT_NOTES — maichess-auth-service

## refresh_token cookie path: `/auth` → `/api/auth` ✓ (task 28)

The REST contract originally documented the `refresh_token` cookie with path `/auth`,
on the assumption the browser talks to auth-service directly. It does not: the web client
reaches auth only through its own Next.js proxy routes under `/api/auth/*`
(`/api/auth/refresh`, `/api/auth/logout`), which forward the cookie to auth-service
server-side. A `/auth`-scoped cookie is never attached by the browser to `/api/auth/refresh`,
so **every refresh silently returned 401 and the user was logged out the moment the 15-min
access token expired** — regardless of activity (the premature-logout bug).

Fix: the cookie path is now `/api/auth` (see `src/cookies.ts`,
`REFRESH_TOKEN_COOKIE_PATH`). This still scopes the long-lived refresh token to the auth
routes only — it is not sent on ordinary page/API navigation. `rest/auth.md` has been
updated to match (REST markdown, not a published package — no version handoff required).
Refresh-token rotation (`GETDEL` + re-insert with a fresh 30-day TTL) was already correct
and is unchanged.


## refresh_tokens: migrated to Redis ✓

The previous direct PostgreSQL connection for refresh tokens has been replaced with Redis.

Tokens are stored as `refresh:{tokenHash}` keys with a 30-day TTL. The value is a JSON object `{"userId": "...", "username": "..."}` so that `consumeRefreshToken` can return both fields without a database JOIN. Atomic token rotation is implemented via Redis `GETDEL`, which atomically reads and deletes the key — equivalent to the previous `SELECT FOR UPDATE` + `DELETE` transaction.

`pg` and its types are fully removed from the service. The only remaining external dependencies for data are:
- `ioredis` → `REDIS_URL` (refresh tokens)
- `@maichess/platform-protos` Database gRPC client → `USER_DB_SERVICE_GRPC_ADDR` (user credential lookups)
