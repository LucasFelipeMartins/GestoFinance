import type { IncomingMessage, ServerResponse } from 'http';
import app from '../server/src/app';

// Vercel serverless entry point: catches every request under /api/* and
// hands it to the same Express app used for local development. Express apps
// are plain (req, res) request handlers, so no adapter library is needed.
export default function handler(req: IncomingMessage, res: ServerResponse): void {
  app(req as never, res as never);
}
