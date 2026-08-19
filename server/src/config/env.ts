import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: (process.env.NODE_ENV ?? 'development') === 'production',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  mongoUrl: required('MONGO_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  maxAvatarSizeMb: Number(process.env.MAX_AVATAR_SIZE_MB ?? 5),
  // When set (production on Vercel), avatars upload to Vercel Blob instead of
  // local disk, which doesn't persist across serverless invocations.
  blobReadWriteToken: process.env.BLOB_READ_WRITE_TOKEN,
};
