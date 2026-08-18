import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'avatars');

export async function saveAvatar(buffer: Buffer, ownerId: string): Promise<string> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  const filename = `${ownerId}-${Date.now()}.webp`;
  const filepath = path.join(UPLOADS_DIR, filename);

  await sharp(buffer)
    .resize(256, 256, { fit: 'cover' })
    .webp({ quality: 82 })
    .toFile(filepath);

  return `/uploads/avatars/${filename}`;
}

export async function deleteAvatar(avatarUrl?: string): Promise<void> {
  if (!avatarUrl || !avatarUrl.startsWith('/uploads/avatars/')) return;
  const filename = path.basename(avatarUrl);
  const filepath = path.join(UPLOADS_DIR, filename);
  await fs.rm(filepath, { force: true });
}
