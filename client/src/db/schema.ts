import Dexie, { Table } from 'dexie';
import { Client, Task, Priority, EntityStatus } from '@/types';

export type OutboxEntity = 'client' | 'task';
export type OutboxType = 'create' | 'update' | 'status' | 'delete';

export interface OutboxEntry {
  seq?: number;
  entity: OutboxEntity;
  entityId: string;
  type: OutboxType;
  payload?: object;
  createdAt: number;
  /** Set after a failed push attempt so the sync engine can back off instead
   * of hammering the same failing request every cycle. */
  lastError?: string;
  attempts: number;
}

export interface MetaEntry {
  key: string;
  value: unknown;
}

/** Local rows mirror the API shape but keep dates as real Date objects,
 * which IndexedDB can index directly (range queries, sorting). */
export interface LocalClient extends Omit<Client, 'createdAt' | 'updatedAt' | 'deliveryDate' | 'completedAt'> {
  createdAt: Date;
  updatedAt: Date;
  deliveryDate?: Date;
  completedAt?: Date;
}

export interface LocalTask extends Omit<Task, 'createdAt' | 'updatedAt' | 'completedAt' | 'dueDate'> {
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  dueDate?: Date;
  priority: Priority;
  status: EntityStatus;
}

class GestorProDB extends Dexie {
  clients!: Table<LocalClient, string>;
  tasks!: Table<LocalTask, string>;
  outbox!: Table<OutboxEntry, number>;
  meta!: Table<MetaEntry, string>;

  constructor() {
    super('gestorpro');
    this.version(1).stores({
      clients: 'id, name, status, priority, updatedAt, createdAt',
      tasks: 'id, status, priority, clientId, dueDate, updatedAt, createdAt',
      outbox: '++seq, entity, entityId, createdAt',
      meta: 'key',
    });
    // v2 adds the deliveryDate index on clients. Existing rows simply have
    // no value for it — Dexie migrates in place, nothing to backfill.
    this.version(2).stores({
      clients: 'id, name, status, priority, deliveryDate, updatedAt, createdAt',
    });
    // v3 adds a compound index for the {entity, entityId} lookups used by
    // cancelPendingCreate/pendingCountByEntity — same columns as before,
    // just indexed together instead of scanned.
    this.version(3).stores({
      outbox: '++seq, entity, entityId, createdAt, [entity+entityId]',
    });
    // v4 adds completedAt on clients, mirroring tasks — drives the Home
    // 24h auto-hide for completed clients.
    this.version(4).stores({
      clients: 'id, name, status, priority, deliveryDate, completedAt, updatedAt, createdAt',
    });
  }
}

export const db = new GestorProDB();
