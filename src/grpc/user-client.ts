import * as grpc from '@grpc/grpc-js';
import { UsersClient } from '@maichess/platform-protos/user-service/v1/users';

if (!process.env.USER_SERVICE_GRPC_ADDR) {
  throw new Error('USER_SERVICE_GRPC_ADDR environment variable is required');
}

const client = new UsersClient(
  process.env.USER_SERVICE_GRPC_ADDR,
  grpc.credentials.createInsecure()
);

export function createUser(
  username: string,
  passwordHash: string
): Promise<{ id: string; username: string }> {
  return new Promise((resolve, reject) => {
    client.createUser({ username, passwordHash }, (err, res) => {
      if (err) {
        if (err.code === grpc.status.ALREADY_EXISTS) {
          reject(Object.assign(new Error('Username already taken'), { statusCode: 409 }));
        } else {
          reject(err);
        }
        return;
      }
      if (!res?.user) {
        reject(new Error('CreateUser returned empty response'));
        return;
      }
      resolve({ id: res.user.id, username: res.user.username });
    });
  });
}
