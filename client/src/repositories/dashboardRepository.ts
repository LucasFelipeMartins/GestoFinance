import { clientRepository } from './clientRepository';
import { taskRepository } from './taskRepository';
import { defaultTaskSort } from '@/utils/taskSort';
import { isOverdue } from '@/utils/formatters';
import { DashboardSummary } from '@/types';

function rate(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

/** Same shape the old server /api/dashboard/summary returned — now computed
 * locally so the Home page works offline. */
async function summary(): Promise<DashboardSummary> {
  const [clients, tasks] = await Promise.all([
    clientRepository.list({ sort: 'createdAt', order: 'desc' }),
    taskRepository.list(),
  ]);

  const totalClients = clients.length;
  const completedClients = clients.filter((c) => c.status === 'completed').length;
  const pendingClients = clients.filter((c) => c.status !== 'completed').length;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in-progress').length;
  const overdueTasks = tasks.filter((t) => isOverdue(t.dueDate, t.status)).length;

  const recentClients = clients.slice(0, 5);
  const recentTasks = [...tasks].sort(defaultTaskSort).slice(0, 5);

  return {
    clients: {
      total: totalClients,
      completed: completedClients,
      pending: pendingClients,
      completionRate: rate(completedClients, totalClients),
    },
    tasks: {
      total: totalTasks,
      completed: completedTasks,
      pending: pendingTasks,
      inProgress: inProgressTasks,
      overdue: overdueTasks,
      completionRate: rate(completedTasks, totalTasks),
    },
    recentClients,
    recentTasks,
  };
}

export const dashboardRepository = { summary };
