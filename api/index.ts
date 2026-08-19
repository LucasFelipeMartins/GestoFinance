import type { IncomingMessage, ServerResponse } from 'http';
import app from '../server/src/app';

// Vercel serverless entry point. All /api/* requests are rewritten here
// (see vercel.json) rather than relying on a bracket catch-all filename —
// Express reads the original req.url itself to route internally, so the
// rewrite's destination doesn't need to encode the path.
export default function handler(req: IncomingMessage, res: ServerResponse): void {
  app(req as never, res as never);
}
