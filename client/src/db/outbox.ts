import { db } from './schema';
import { OutboxEntity, OutboxType } from './schema';

export async function enqueueOutbox(
  entity: OutboxEntity,
  entityId: string,
  type: OutboxType,
  payload?: object
): Promise<void> {
  await db.outbox.add({ entity, entityId, type, payload, createdAt: Date.now(), attempts: 0 });
}

/**
 * If the entity was created (and possibly edited) locally but never synced,
 * deleting it locally means the server never needs to hear about any of it —
 * drop the whole queued history for that id instead of pushing a delete.
 * Returns true if it cancelled something (caller should skip queuing a delete).
 */
export async function cancelPendingCreate(entity: OutboxEntity, entityId: string): Promise<boolean> {
  const entries = await db.outbox.where({ entity, entityId }).toArray();
  const hasPendingCreate = entries.some((e) => e.type === 'create');
  if (!hasPendingCreate) return false;

  await db.outbox.where({ entity, entityId }).delete();
  return true;
}

export async function pendingCount(): Promise<number> {
  return db.outbox.count();
}

export async function pendingCountByEntity(entityId: string): Promise<number> {
  return db.outbox.where('entityId').equals(entityId).count();
}
