import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { env } from '../config/env';

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'avatars');

async function processAvatar(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).resize(256, 256, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
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

  if (env.blobReadWriteToken) {
    const { del } = await import('@vercel/blob');
    await del(avatarUrl, { token: env.blobReadWriteToken }).catch(() => {});
  }
}
