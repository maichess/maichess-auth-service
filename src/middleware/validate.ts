function validationError(message: string): Error {
  return Object.assign(new Error(message), { statusCode: 422 });
}

export function validateRegister(body: unknown): { username: string; password: string } {
  if (!body || typeof body !== 'object') throw validationError('Request body must be an object');
  const { username, password } = body as Record<string, unknown>;

  if (typeof username !== 'string' || !/^[a-zA-Z0-9]{3,32}$/.test(username)) {
    throw validationError('username must be 3–32 alphanumeric characters');
  }
  if (typeof password !== 'string' || password.length < 8) {
    throw validationError('password must be at least 8 characters');
  }
  return { username, password };
}

export function validateLogin(body: unknown): { username: string; password: string } {
  if (!body || typeof body !== 'object') throw validationError('Request body must be an object');
  const { username, password } = body as Record<string, unknown>;

  if (typeof username !== 'string' || !username) throw validationError('username is required');
  if (typeof password !== 'string' || !password) throw validationError('password is required');
  return { username, password };
}

export function validateRefresh(body: unknown): { refresh_token: string } {
  if (!body || typeof body !== 'object') throw validationError('Request body must be an object');
  const { refresh_token } = body as Record<string, unknown>;

  if (typeof refresh_token !== 'string' || !refresh_token) {
    throw validationError('refresh_token is required');
  }
  return { refresh_token };
}
