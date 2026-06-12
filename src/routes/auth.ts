import express, { Router } from 'express';
import bcrypt from 'bcrypt';
import { validateRegister, validateLogin } from '../middleware/validate';
import { getUserByUsername, insertRefreshToken, consumeRefreshToken, deleteRefreshToken } from '../db/queries';
import { signAccessToken, generateRefreshToken, hashToken } from '../tokens';
import { setTokenCookies, clearTokenCookies } from '../cookies';
import { createUser } from '../grpc/user-client';

export const authRouter = Router();

authRouter.use(express.json());

authRouter.post('/register', async (req, res) => {
  const { username, password } = validateRegister(req.body);

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createUser(username, passwordHash);

  const rawToken = generateRefreshToken();
  await insertRefreshToken(user.id, user.username, hashToken(rawToken));
  const accessToken = signAccessToken({ sub: user.id, username: user.username });

  setTokenCookies(res, accessToken, rawToken);
  res.status(201).json({ user_id: user.id });
});

authRouter.post('/login', async (req, res) => {
  const { username, password } = validateLogin(req.body);

  const user = await getUserByUsername(username);
  const validCredentials = user && await bcrypt.compare(password, user.password_hash);
  if (!validCredentials) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  const rawToken = generateRefreshToken();
  await insertRefreshToken(user.id, user.username, hashToken(rawToken));
  const accessToken = signAccessToken({ sub: user.id, username: user.username });

  setTokenCookies(res, accessToken, rawToken);
  res.status(200).json({ user_id: user.id });
});

authRouter.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) {
    throw Object.assign(new Error('Missing refresh token cookie'), { statusCode: 401 });
  }

  const record = await consumeRefreshToken(hashToken(refreshToken));
  if (!record) {
    throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 });
  }

  const newRawToken = generateRefreshToken();
  await insertRefreshToken(record.user_id, record.username, hashToken(newRawToken));
  const accessToken = signAccessToken({ sub: record.user_id, username: record.username });

  setTokenCookies(res, accessToken, newRawToken);
  res.status(200).send();
});

authRouter.post('/logout', async (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  if (refreshToken) {
    await deleteRefreshToken(hashToken(refreshToken));
  }
  clearTokenCookies(res);
  res.status(204).send();
});
