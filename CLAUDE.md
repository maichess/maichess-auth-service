# CLAUDE.md — maichess-auth-service

## Role

Lightweight Express.js service responsible for account registration, credential login, and JWT token lifecycle. Issues access tokens (15 min JWTs) and refresh tokens (30-day opaque UUIDs stored server-side). Exposes a gRPC `ValidateToken` endpoint for internal service-to-service token verification.

## Contracts

Always read contracts before implementing:

- **REST:** `maichess-api-contracts/rest/auth.md` — register, login, refresh, logout
- **gRPC:** `maichess-api-contracts/protos/auth-service/v1/auth.proto` — `ValidateToken`

On registration, call `Users.CreateUser` via gRPC (see `maichess-api-contracts/protos/user-service/`). On login, verify credentials against PostgreSQL (read-only). Do not infer behavior from other services.

## Stack

- **Runtime:** Node.js, TypeScript
- **Framework:** Express.js 5
- **Database:** PostgreSQL (user credentials) via MCP `postgres`
- **gRPC:** server for `ValidateToken`, client for `Users.CreateUser`

## Commands

```bash
npm run dev      # start with nodemon + ts-node (watch mode)
```

## Architecture

Keep the service small and flat. Avoid over-engineering.

```
src/
  routes/        # one file per REST endpoint group
  grpc/          # gRPC server and client setup
  middleware/    # express middleware (validation, error handling)
  db/            # postgres queries — plain SQL, no ORM
  index.ts       # app bootstrap only
```

## Coding Principles

- **No ORM.** Write plain parameterized SQL queries.
- **No classes for stateless logic.** Use plain functions.
- **One responsibility per module.** A route handler validates input and calls a service function — it does not touch the database directly.
- **Explicit over implicit.** No magic, no decorators, no reflection.
- **Fail fast.** Validate at the boundary (request body), return errors immediately — do not propagate invalid state inward.
- **No unused abstractions.** Do not create helpers, base classes, or utilities for one-off operations.

## Error Handling

Use Express 5's native async error propagation — no try/catch wrapping every handler. Define a single error middleware in `middleware/error.ts` that maps known error types to HTTP status codes. Unhandled errors become 500.

Do not leak internal error details in responses. Log the full error server-side.

## Security

- Hash passwords with `bcrypt` before storing or comparing.
- Sign JWTs with a secret from environment variables — never hardcode.
- Store refresh tokens hashed in PostgreSQL; invalidate on use (rotation) and on logout.
- Parameterize all SQL — no string concatenation.

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | HTTP port (default `3000`) |
| `JWT_SECRET` | Secret for signing access tokens |
| `DATABASE_URL` | PostgreSQL connection string |
| `USER_SERVICE_GRPC_ADDR` | Address of the user-service gRPC server |

## Database

Auth reads/writes the `users` table (owned by the user-service) for credential verification, and owns a `refresh_tokens` table. Do not write migrations that alter user-service-owned tables.

Connect only when the SSH tunnel is open: `ssh -N maichess-db`.
