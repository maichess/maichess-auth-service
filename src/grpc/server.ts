import * as grpc from '@grpc/grpc-js';
import { AuthService, type AuthServer } from '@maichess/platform-protos/auth-service/v1/auth';
import { verifyAccessToken } from '../tokens';

const authImpl: AuthServer = {
  validateToken(call, callback) {
    try {
      const payload = verifyAccessToken(call.request.accessToken);
      callback(null, { valid: true, userId: payload.sub, username: payload.username });
    } catch {
      callback(null, { valid: false, userId: '', username: '' });
    }
  },
};

export function startGrpcServer(): void {
  const server = new grpc.Server();
  server.addService(AuthService, authImpl);

  const port = process.env.GRPC_PORT ?? '50051';
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error('Failed to bind gRPC server:', err);
        process.exit(1);
      }
      console.log(`gRPC server listening on port ${boundPort}`);
    }
  );
}
