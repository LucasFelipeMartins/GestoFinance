import mongoose from 'mongoose';
import { env } from './env';

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUrl);
  // eslint-disable-next-line no-console
  console.log(`[db] connected to MongoDB (${mongoose.connection.name})`);
}
