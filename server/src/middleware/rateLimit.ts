import { Request } from 'express';
import rateLimit, { Options, Store, ClientRateLimitInfo } from 'express-rate-limit';
import { Schema, model } from 'mongoose';
import { env } from '../config/env';

/**
 * Rate-limit counters kept in MongoDB instead of process memory. On Vercel
 * every cold start (and every parallel instance) has its own memory, so an
 * in-memory limiter forgets attackers as fast as it counts them. One row per
 * (limiter, client, window); TTL index cleans them up.
 */
interface HitDocument {
  key: string;
  hits: number;
  expiresAt: Date;
}

const hitSchema = new Schema<HitDocument>(
  {
    key: { type: String, required: true, unique: true },
    hits: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { versionKey: false }
);

const RateLimitHit = model<HitDocument>('RateLimitHit', hitSchema);

class MongoStore implements Store {
  localKeys = false;
  private windowMs = 60_000;

  constructor(readonly prefix: string) {}

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  /** Fixed windows aligned to the clock: the bucket id is part of the key,
   * so a single atomic upsert + $inc is all a hit needs. */
  private bucket(key: string): { id: string; resetTime: Date } {
    const start = Math.floor(Date.now() / this.windowMs) * this.windowMs;
    return { id: `${this.prefix}:${key}:${start}`, resetTime: new Date(start + this.windowMs) };
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    const { id, resetTime } = this.bucket(key);
    const row = await RateLimitHit.findOne({ key: id }).lean();
    return row ? { totalHits: row.hits, resetTime } : undefined;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const { id, resetTime } = this.bucket(key);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const row = await RateLimitHit.findOneAndUpdate(
          { key: id },
          { $inc: { hits: 1 }, $setOnInsert: { key: id, expiresAt: resetTime } },
          { upsert: true, new: true }
        ).lean();
        return { totalHits: row?.hits ?? 1, resetTime };
      } catch (err) {
        // Two first hits racing on the upsert: one of them gets E11000 and
        // simply retries as a plain increment.
        const dup = err && typeof err === 'object' && (err as { code?: number }).code === 11000;
        if (!dup || attempt === 1) throw err;
      }
    }
    return { totalHits: 1, resetTime };
  }

  async decrement(key: string): Promise<void> {
    await RateLimitHit.updateOne({ key: this.bucket(key).id }, { $inc: { hits: -1 } });
  }

  async resetKey(key: string): Promise<void> {
    await RateLimitHit.deleteOne({ key: this.bucket(key).id });
  }
}

/**
 * Who is "the client". Vercel overwrites x-forwarded-for / x-real-ip with the
 * real address (they cannot be spoofed from outside), so in production those
 * are the truth; locally req.ip is the socket peer.
 */
export function clientIp(req: Request): string {
  if (env.isProduction) {
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string' && realIp) return realIp;
    const forwarded = req.headers['x-forwarded-for'];
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

export interface LimiterOptions {
  /** Unique name — becomes the key prefix in the database. */
  name: string;
  windowMs: number;
  limit: number;
  message: string;
  /** Optional: limit per something other than the IP (an account, say). */
  keyGenerator?: (req: Request) => string;
  /** Don't count requests that ended in a 2xx/3xx. */
  skipSuccessfulRequests?: boolean;
}

export function createLimiter({
  name,
  windowMs,
  limit,
  message,
  keyGenerator,
  skipSuccessfulRequests,
}: LimiterOptions) {
  return rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests: skipSuccessfulRequests ?? false,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message },
    store: new MongoStore(name),
    keyGenerator: keyGenerator ?? clientIp,
    // The built-in checks assume the default key generator and an in-memory
    // store; with our own of both they only produce noise.
    validate: false,
    // A database hiccup must not turn every login into a 500: log and let
    // the request through — with the database down nothing works anyway.
    passOnStoreError: true,
  });
}
