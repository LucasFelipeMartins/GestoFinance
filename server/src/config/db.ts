import mongoose from 'mongoose';
import { env } from './env';

// Cached across warm serverless invocations so we don't reconnect (and
// exhaust Atlas' connection limit) on every request.
let cached: Promise<typeof mongoose> | null = null;

export function connectDatabase(): Promise<typeof mongoose> {
  if (!cached) {
    mongoose.set('strictQuery', true);
    cached = mongoose
      .connect(env.mongoUrl)
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
