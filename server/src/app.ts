import path from 'path';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { env } from './config/env';
import { connectDatabase } from './config/db';
import routes from './routes';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import { asyncHandler } from './utils/asyncHandler';
import { webhook as billingWebhook } from './controllers/billing.controller';

const app = express();

// Behind Vercel's proxy the socket peer is the proxy; the real client is in
// the forwarded headers, which Vercel sets itself (they can't be spoofed
// from outside). Needed for req.ip, req.protocol and secure cookies.
if (env.isProduction) app.set('trust proxy', true);
app.disable('x-powered-by');

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

// Cross-site request forgery guard for anything that changes state: a
// browser always sends Origin on such requests, and it must be one of ours.
// Requests without Origin (the mobile app, Mercado Pago's webhook, curl)
// carry no ambient cookie to abuse, so they pass.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (SAFE_METHODS.has(req.method) || !origin) {
    next();
    return;
  }
  const host = req.headers.host;
  const sameOrigin = origin === `https://${host}` || origin === `http://${host}`;
  if (sameOrigin || env.clientOrigins.includes(origin)) {
    next();
    return;
  }
  res.status(403).json({ message: 'Origem não permitida.' });
});

app.use(cookieParser());

// Mercado Pago's notification. It arrives with any content type (sometimes
// none), so it gets its own lenient JSON parser; the signature covers headers
// and the query string, never the body. It needs the database like
// everything else, so the connection guard is applied here too.
app.post(
  '/api/billing/webhook',
  express.json({ type: () => true }),
  asyncHandler(async (_req, _res, next) => {
    await connectDatabase();
    next();
  }),
  billingWebhook
);

app.use(express.json({ limit: '200kb' }));
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

// Says whether the database is actually reachable, not just that the
// function booted — that is what an uptime monitor should watch.
app.get('/api/health', async (_req, res) => {
  try {
    await connectDatabase();
    await mongoose.connection.db?.admin().ping();
    res.json({ status: 'ok', db: 'up' });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'down' });
  }
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
