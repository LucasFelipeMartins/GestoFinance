import path from 'path';
import express from 'express';
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

// Hand-rolled instead of the `cors` package so a request whose Origin
// matches the Host it hit (the normal case: this same Vercel deployment
// serving both the SPA and /api) is always allowed — including preview
// deployment URLs we can't know in advance — without needing every one
// added to CLIENT_ORIGIN by hand. The browser sends Origin even for
// same-origin POSTs, so without this same-origin requests get rejected too.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    const sameOrigin = origin === `https://${req.headers.host}` || origin === `http://${req.headers.host}`;
    if (sameOrigin || env.clientOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    }
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.sendStatus(204);
    return;
  }
  next();
});

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
