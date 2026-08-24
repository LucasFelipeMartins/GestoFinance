import { db } from './schema';

export { db } from './schema';
export * from './schema';

/**
 * Wipes all local data. Called on logout — the device's IndexedDB is shared
 * by whoever uses this app on it, so a second account logging in must never
 * see the previous account's clients/tasks.
 */
export async function clearLocalData(): Promise<void> {
  await Promise.all([
    db.clients.clear(),
    db.tasks.clear(),
    db.finance.clear(),
    db.outbox.clear(),
    db.meta.clear(),
  ]);
}
