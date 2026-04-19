import { pool } from './client';

export async function getUserByUsername(
  username: string
): Promise<{ id: string; username: string; password_hash: string } | null> {
  const result = await pool.query<{ id: string; username: string; password_hash: string }>(
    'SELECT id, username, password_hash FROM users WHERE username = $1',
    [username]
  );
  return result.rows[0] ?? null;
}

export async function insertRefreshToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date
): Promise<void> {
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt]
  );
}

export async function consumeRefreshToken(
  tokenHash: string
): Promise<{ user_id: string; username: string } | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query<{ user_id: string; username: string }>(
      `SELECT rt.user_id, u.username
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1 AND rt.expires_at > NOW()
       FOR UPDATE`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
    await client.query('COMMIT');

    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteRefreshToken(tokenHash: string): Promise<void> {
  await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
}
