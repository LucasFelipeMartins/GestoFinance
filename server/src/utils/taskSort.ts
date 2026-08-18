import { TaskDocument } from '../models/Task';
import { PRIORITY_RANK } from '../types/enums';

function isOverdue(task: Pick<TaskDocument, 'dueDate' | 'status'>): boolean {
  return Boolean(task.dueDate) && task.dueDate! < new Date() && task.status !== 'completed';
}

/** Ordenação padrão: vencidas > alta prioridade > próximas do prazo > demais (seção 32). */
export function defaultTaskSort(a: TaskDocument, b: TaskDocument): number {
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
