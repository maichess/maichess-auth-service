import * as grpc from '@grpc/grpc-js';
import { DatabaseClient } from '@maichess/platform-protos/database-service/v1/database';
import type { Struct, Value } from '@maichess/platform-protos/google/protobuf/struct';

if (!process.env.USER_DB_SERVICE_GRPC_ADDR) {
  throw new Error('USER_DB_SERVICE_GRPC_ADDR environment variable is required');
}

const client = new DatabaseClient(
  process.env.USER_DB_SERVICE_GRPC_ADDR,
  grpc.credentials.createInsecure()
);

function stringField(value: string): Value {
  return { kind: { $case: 'stringValue', stringValue: value } };
}

function getStringField(s: Struct, key: string): string {
  const v = s.fields[key];
  return v?.kind?.$case === 'stringValue' ? v.kind.stringValue : '';
}

export function getUserByUsername(
  username: string
): Promise<{ id: string; username: string; password_hash: string } | null> {
  const filter: Struct = { fields: { username: stringField(username) } };
  return new Promise((resolve, reject) => {
    client.list({ collection: 'users', filter, limit: 1, offset: 0 }, (err, res) => {
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
        id: getStringField(record, 'id'),
        username: getStringField(record, 'username'),
        password_hash: getStringField(record, 'password_hash'),
      });
    });
  });
}
