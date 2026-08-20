import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import { TaskWithClient } from '@/types';
import { hasExplicitTime, formatTime } from '@/utils/formatters';

const REMINDER_HOURS_BEFORE = 5;
const REMINDER_TITLE = 'Lembrete de tarefa';
/** Neither the native nor the web implementation exposes a "fire right now"
 * call — a catch-up reminder is just scheduled a moment in the future. */
const CATCH_UP_DELAY_MS = 500;

/** @capacitor/local-notifications auto-picks its native or web
 * implementation (a real Web Notification API-backed shim) via
 * registerPlugin — no Capacitor.isNativePlatform() branching needed here. */

/** Notification ids must be 32-bit ints — derive a stable one from the
 * task's UUID instead of tracking a separate counter. */
function notificationId(taskId: string): number {
  let hash = 0;
  for (let i = 0; i < taskId.length; i++) {
    hash = (hash * 31 + taskId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

function reminderAt(dueDate: Date): Date {
  return new Date(dueDate.getTime() - REMINDER_HOURS_BEFORE * 60 * 60 * 1000);
}

function reminderBody(task: TaskWithClient, due: Date): string {
  const who = task.client ? ` — ${task.client.name}` : '';
  return `"${task.title}" vence às ${formatTime(due)}${who}`;
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  } catch {
    // Web without Notification support, or the browser blocking it outright,
    // throws instead of resolving 'denied' — no reminders either way.
    return false;
  }
}

/**
 * Reconciles every task's reminder against its current state, using
 * getPending() as the source of truth for what's actually scheduled. On
 * native this reflects real OS-persisted alarms (survives app restarts); on
 * web it only reflects the current page load, since browser notifications
 * have no OS-level persistence without a push backend.
 *
 * Returns the ids of tasks whose 5h-before window has already passed —
 * callers should turn reminderEnabled off for these (done at the call site
 * so it goes through the normal mutation/invalidation path instead of
 * reaching into the repository from here).
 */
export async function reconcileReminders(tasks: TaskWithClient[]): Promise<string[]> {
  const eligible = tasks.filter(
    (task): task is TaskWithClient & { dueDate: string } =>
      Boolean(task.reminderEnabled) && task.status !== 'completed' && Boolean(task.dueDate) && hasExplicitTime(task.dueDate)
  );
  const eligibleIds = new Set(eligible.map((task) => notificationId(task.id)));

  const { notifications: pending } = await LocalNotifications.getPending();
  const pendingIds = new Set(pending.map((n) => n.id));

  const staleIds = [...pendingIds].filter((id) => !eligibleIds.has(id));
  if (staleIds.length > 0) {
    await LocalNotifications.cancel({ notifications: staleIds.map((id) => ({ id })) });
  }

  const now = Date.now();
  const toSchedule: LocalNotificationSchema[] = [];
  const handled: string[] = [];

  for (const task of eligible) {
    const due = new Date(task.dueDate);
    const id = notificationId(task.id);
    const at = reminderAt(due);

    if (at.getTime() > now) {
      toSchedule.push({ id, title: REMINDER_TITLE, body: reminderBody(task, due), schedule: { at } });
      continue;
    }

    // The trigger instant has passed — either it already fired naturally
    // (no longer pending) or the app was closed right through it (still
    // pending). Either way its job is done; the caller disables the flag.
    handled.push(task.id);
    if (pendingIds.has(id) && due.getTime() > now) {
      toSchedule.push({
        id,
        title: REMINDER_TITLE,
        body: reminderBody(task, due),
        schedule: { at: new Date(now + CATCH_UP_DELAY_MS) },
      });
    }
  }

  if (toSchedule.length > 0) {
    await LocalNotifications.schedule({ notifications: toSchedule });
  }

  return handled;
}
