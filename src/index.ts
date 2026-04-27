import './tracing';
import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth';
import { errorMiddleware } from './middleware/error';
import { startGrpcServer } from './grpc/server';

for (const envVar of ['JWT_SECRET', 'REDIS_URL', 'USER_SERVICE_GRPC_ADDR', 'USER_DB_SERVICE_GRPC_ADDR']) {
  if (!process.env[envVar]) {
    throw new Error(`${envVar} environment variable is required`);
  }
}

const app = express();

app.use(cookieParser());
app.use('/auth', authRouter);
app.use(errorMiddleware);

const PORT = process.env.PORT ?? '3000';
app.listen(Number(PORT), () => {
  console.log(`HTTP server listening on port ${PORT}`);
});

startGrpcServer();
