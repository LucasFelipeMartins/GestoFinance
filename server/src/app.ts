import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { connectDatabase } from './config/db';
import routes from './routes';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import { asyncHandler } from './utils/asyncHandler';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header (native app requests, curl, server-to-server) or an
      // allow-listed origin: allow. Anything else: reject.
      if (!origin || env.clientOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
if (!env.isProduction) {
  app.use(morgan('dev'));
}

// Ensures the (cached) MongoDB connection is ready before any request is
// handled — required on serverless, where there's no long-lived startup phase.
app.use(
  asyncHandler(async (_req, _res, next) => {
    await connectDatabase();
    next();
  })
);

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
