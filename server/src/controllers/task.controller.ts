import { Request, Response } from 'express';
import { FilterQuery, SortOrder } from 'mongoose';
import { Task, TaskDocument } from '../models/Task';
import { Client } from '../models/Client';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { defaultTaskSort } from '../utils/taskSort';
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  taskQuerySchema,
} from '../validators/task.validators';

/** Tasks reference clients by localId (a plain string), not a Mongoose ref,
 * so populate() doesn't apply — attach the small bits the UI needs manually. */
async function attachClientInfo<T extends { clientId?: string }>(
  tasks: T[],
  userId: string
): Promise<(T & { clientId?: { localId: string; name: string; avatarUrl?: string; initials: string } | string })[]> {
  const clientIds = [...new Set(tasks.map((t) => t.clientId).filter((id): id is string => Boolean(id)))];
  if (clientIds.length === 0) return tasks;

  const clients = await Client.find({ userId, localId: { $in: clientIds } })
    .select('localId name avatarUrl initials')
    .lean();
  const byLocalId = new Map(clients.map((c) => [c.localId, c]));

  return tasks.map((task) => {
    if (!task.clientId) return task;
    const client = byLocalId.get(task.clientId);
    return client ? { ...task, clientId: client } : task;
  });
}

export const listTasks = asyncHandler(async (req: Request, res: Response) => {
  const query = taskQuerySchema.parse(req.query);

  const filter: FilterQuery<TaskDocument> = { userId: req.userId };
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.clientId) filter.clientId = query.clientId;
  if (query.search) {
    const regex = new RegExp(query.search.trim(), 'i');
    filter.$or = [{ title: regex }, { description: regex }];
  }

  let tasks = await Task.find(filter).lean();

  if (query.sort) {
    const order = query.order === 'asc' ? 1 : -1;
    tasks = [...tasks].sort((a, b) => {
      const av = a[query.sort as keyof typeof a];
      const bv = b[query.sort as keyof typeof b];
      if (av === bv) return 0;
      if (av === undefined) return 1;
      if (bv === undefined) return -1;
      return av > bv ? order : -order;
    });
  } else {
    tasks = [...tasks].sort(defaultTaskSort);
  }

  const withClients = await attachClientInfo(tasks, req.userId!);
  res.json({ tasks: withClients });
});

export const getTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await Task.findOne({ localId: req.params.id, userId: req.userId }).lean();
  if (!task) throw ApiError.notFound('Tarefa não encontrada.');
  const [withClient] = await attachClientInfo([task], req.userId!);
  res.json({ task: withClient });
});

export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const data = createTaskSchema.parse(req.body);

  const existing = await Task.findOne({ userId: req.userId, localId: data.localId }).lean();
  if (existing) {
    const [withClient] = await attachClientInfo([existing], req.userId!);
    res.status(200).json({ task: withClient });
    return;
  }

  const task = await Task.create({
    ...data,
    clientId: data.clientId || undefined,
    userId: req.userId,
  });

  const [withClient] = await attachClientInfo([task.toObject()], req.userId!);
  res.status(201).json({ task: withClient });
});

export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const data = updateTaskSchema.parse(req.body);

  const task = await Task.findOne({ localId: req.params.id, userId: req.userId });
  if (!task) throw ApiError.notFound('Tarefa não encontrada.');

  if (data.updatedAt < task.updatedAt) {
    const [withClient] = await attachClientInfo([task.toObject()], req.userId!);
    res.json({ task: withClient });
    return;
  }

  Object.assign(task, data);
  if (data.clientId === '') task.clientId = undefined;

  await task.save();
  const [withClient] = await attachClientInfo([task.toObject()], req.userId!);
  res.json({ task: withClient });
});

export const updateTaskStatus = asyncHandler(async (req: Request, res: Response) => {
  const data = updateTaskStatusSchema.parse(req.body);

  const task = await Task.findOne({ localId: req.params.id, userId: req.userId });
  if (!task) throw ApiError.notFound('Tarefa não encontrada.');

  if (data.updatedAt < task.updatedAt) {
    const [withClient] = await attachClientInfo([task.toObject()], req.userId!);
    res.json({ task: withClient });
    return;
  }

  task.status = data.status;
  task.updatedAt = data.updatedAt;
  task.completedAt = data.status === 'completed' ? (data.completedAt ?? data.updatedAt) : undefined;

  await task.save();
  const [withClient] = await attachClientInfo([task.toObject()], req.userId!);
  res.json({ task: withClient });
});

export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await Task.findOneAndDelete({ localId: req.params.id, userId: req.userId });
  if (!task) throw ApiError.notFound('Tarefa não encontrada.');
  res.status(204).send();
});
