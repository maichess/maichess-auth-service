import * as grpc from '@grpc/grpc-js';
import { DatabaseClient } from '@maichess/platform-protos/database-service/v1/database';

if (!process.env.USER_DB_SERVICE_GRPC_ADDR) {
  throw new Error('USER_DB_SERVICE_GRPC_ADDR environment variable is required');
}

const client = new DatabaseClient(
  process.env.USER_DB_SERVICE_GRPC_ADDR,
  grpc.credentials.createInsecure()
);

function getString(record: { [key: string]: any }, key: string): string {
  const v = record[key];
  return typeof v === 'string' ? v : '';
}

export function getUserByUsername(
  username: string
): Promise<{ id: string; username: string; password_hash: string } | null> {
  return new Promise((resolve, reject) => {
    client.list({ collection: 'users', filter: { username }, limit: 1, offset: 0 }, (err, res) => {
      if (err) {
        reject(err);
        return;
      }
      const record = res?.records?.[0];
      if (!record) {
        resolve(null);
        return;
      }
      resolve({
        id: getString(record, 'id'),
        username: getString(record, 'username'),
        password_hash: getString(record, 'password_hash'),
      });
    });
  });
}
