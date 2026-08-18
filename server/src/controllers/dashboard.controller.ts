import { Request, Response } from 'express';
import { Client } from '../models/Client';
import { Task } from '../models/Task';
import { asyncHandler } from '../utils/asyncHandler';
import { defaultTaskSort } from '../utils/taskSort';

function rate(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

export const getDashboardSummary = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;

  const [clients, tasks] = await Promise.all([
    Client.find({ userId }).sort({ createdAt: -1 }).lean(),
    Task.find({ userId }).populate('clientId', 'name avatarUrl initials'),
  ]);

  const now = new Date();

  const totalClients = clients.length;
  const completedClients = clients.filter((c) => c.status === 'completed').length;
  const pendingClients = clients.filter((c) => c.status !== 'completed').length;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in-progress').length;
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && t.dueDate < now && t.status !== 'completed'
  ).length;

  const recentClients = clients.slice(0, 5);
  const recentTasks = [...tasks].sort(defaultTaskSort).slice(0, 5);

  res.json({
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
  });
});
