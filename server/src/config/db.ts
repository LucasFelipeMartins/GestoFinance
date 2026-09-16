import mongoose from 'mongoose';
import { env } from './env';

// Cached across warm serverless invocations so we don't reconnect (and
// exhaust Atlas' connection limit) on every request.
let cached: Promise<typeof mongoose> | null = null;

export function connectDatabase(): Promise<typeof mongoose> {
  if (!cached) {
    mongoose.set('strictQuery', true);
    cached = mongoose
      .connect(env.mongoUrl, {
        // Atlas unreachable -> a clear 500 in ~8 s, not a request that hangs
        // until Vercel kills the function.
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 45000,
        // Each warm serverless instance holds its own pool; keep them small
        // so a traffic spike doesn't exhaust the cluster's connection limit.
        maxPoolSize: 10,
      })
      .then((instance) => {
        // eslint-disable-next-line no-console
        console.log(`[db] connected to MongoDB (${instance.connection.name})`);
        return instance;
      })
      .catch((err) => {
        cached = null;
        throw err;
      });
  }
  return cached;
}
