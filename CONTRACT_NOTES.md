# CONTRACT_NOTES — maichess-auth-service

## refresh_tokens: migrated to Redis ✓

The previous direct PostgreSQL connection for refresh tokens has been replaced with Redis.

Tokens are stored as `refresh:{tokenHash}` keys with a 30-day TTL. The value is a JSON object `{"userId": "...", "username": "..."}` so that `consumeRefreshToken` can return both fields without a database JOIN. Atomic token rotation is implemented via Redis `GETDEL`, which atomically reads and deletes the key — equivalent to the previous `SELECT FOR UPDATE` + `DELETE` transaction.

`pg` and its types are fully removed from the service. The only remaining external dependencies for data are:
- `ioredis` → `REDIS_URL` (refresh tokens)
- `@maichess/platform-protos` Database gRPC client → `USER_DB_SERVICE_GRPC_ADDR` (user credential lookups)
