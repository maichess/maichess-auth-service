import { redis } from './redis-client';

export { getUserByUsername } from '../grpc/db-client';

const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const key = (tokenHash: string) => `refresh:${tokenHash}`;

export async function insertRefreshToken(
  userId: string,
  username: string,
  tokenHash: string
): Promise<void> {
  await redis.set(key(tokenHash), JSON.stringify({ userId, username }), 'EX', REFRESH_TOKEN_TTL_SECONDS);
}

export async function consumeRefreshToken(
  tokenHash: string
): Promise<{ user_id: string; username: string } | null> {
  const value = await redis.getdel(key(tokenHash));
  if (!value) return null;
  const { userId, username } = JSON.parse(value) as { userId: string; username: string };
  return { user_id: userId, username };
}

export async function deleteRefreshToken(tokenHash: string): Promise<void> {
  await redis.del(key(tokenHash));
}
