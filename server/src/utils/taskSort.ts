import { PRIORITY_RANK, Priority, EntityStatus } from '../types/enums';

interface SortableTask {
  dueDate?: Date;
  status: EntityStatus;
  priority: Priority;
  createdAt: Date;
}

function isOverdue(task: Pick<SortableTask, 'dueDate' | 'status'>): boolean {
  return Boolean(task.dueDate) && task.dueDate! < new Date() && task.status !== 'completed';
}

/** Ordenação padrão: vencidas > alta prioridade > próximas do prazo > demais (seção 32). */
export function defaultTaskSort(a: SortableTask, b: SortableTask): number {
  const overdueA = isOverdue(a) ? 0 : 1;
  const overdueB = isOverdue(b) ? 0 : 1;
  if (overdueA !== overdueB) return overdueA - overdueB;

  const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (priorityDiff !== 0) return priorityDiff;

  const dueA = a.dueDate ? a.dueDate.getTime() : Infinity;
  const dueB = b.dueDate ? b.dueDate.getTime() : Infinity;
  if (dueA !== dueB) return dueA - dueB;

  return b.createdAt.getTime() - a.createdAt.getTime();
}
