import { Priority, EntityStatus } from '@/types';

const PRIORITY_RANK: Record<Priority, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
  'very-low': 5,
};

interface SortableTask {
  dueDate?: string;
  status: EntityStatus;
  priority: Priority;
  createdAt: string;
}

function isOverdue(task: Pick<SortableTask, 'dueDate' | 'status'>): boolean {
  if (!task.dueDate || task.status === 'completed') return false;
  return new Date(task.dueDate).getTime() < Date.now();
}

/** Mirrors server/src/utils/taskSort.ts — must behave the same online or off. */
export function defaultTaskSort(a: SortableTask, b: SortableTask): number {
  const overdueA = isOverdue(a) ? 0 : 1;
  const overdueB = isOverdue(b) ? 0 : 1;
  if (overdueA !== overdueB) return overdueA - overdueB;

  const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (priorityDiff !== 0) return priorityDiff;

  const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
  const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
  if (dueA !== dueB) return dueA - dueB;

  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}
