import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { env } from '../config/env';
import { ApiError } from './ApiError';

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'avatars');

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);
// 256x256 output never needs more than this; a 40k x 40k "bomb" is refused
// before it is decoded.
const MAX_INPUT_PIXELS = 40_000_000;

async function processAvatar(buffer: Buffer): Promise<Buffer> {
  const image = sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' });
  // The multipart MIME type is whatever the client said; the bytes decide.
  const metadata = await image.metadata().catch(() => undefined);
  if (!metadata?.format || !ALLOWED_FORMATS.has(metadata.format)) {
    throw ApiError.badRequest('Formato de imagem não suportado. Use JPG, PNG ou WebP.');
  }
  return image.rotate().resize(256, 256, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
}

/** Only files we uploaded ourselves may be deleted: our Blob store's host, avatars/ folder. */
function isOwnBlobUrl(avatarUrl: string): boolean {
  try {
    const url = new URL(avatarUrl);
    return url.protocol === 'https:' && url.hostname.endsWith('.public.blob.vercel-storage.com') && url.pathname.startsWith('/avatars/');
  } catch {
    return false;
  }
}

async function saveToBlob(processed: Buffer, filename: string): Promise<string> {
  const { put } = await import('@vercel/blob');
  const blob = await put(`avatars/${filename}`, processed, {
    access: 'public',
    contentType: 'image/webp',
    token: env.blobReadWriteToken,
  });
  return blob.url;
}

async function saveToDisk(processed: Buffer, filename: string): Promise<string> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOADS_DIR, filename), processed);
  return `/uploads/avatars/${filename}`;
}

export async function saveAvatar(buffer: Buffer, ownerId: string): Promise<string> {
  const processed = await processAvatar(buffer);
  const filename = `${ownerId}-${Date.now()}.webp`;

  return env.blobReadWriteToken ? saveToBlob(processed, filename) : saveToDisk(processed, filename);
}

export async function deleteAvatar(avatarUrl?: string): Promise<void> {
  if (!avatarUrl) return;

  if (avatarUrl.startsWith('/uploads/avatars/')) {
    const filepath = path.join(UPLOADS_DIR, path.basename(avatarUrl));
    await fs.rm(filepath, { force: true });
    return;
  }

  if (env.blobReadWriteToken && isOwnBlobUrl(avatarUrl)) {
    const { del } = await import('@vercel/blob');
    await del(avatarUrl, { token: env.blobReadWriteToken }).catch(() => {});
  }
}
