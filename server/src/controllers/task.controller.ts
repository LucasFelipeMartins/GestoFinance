import { Request, Response } from 'express';
import { FilterQuery, SortOrder } from 'mongoose';
import { Task, TaskDocument } from '../models/Task';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { defaultTaskSort } from '../utils/taskSort';
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  taskQuerySchema,
} from '../validators/task.validators';

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

  let tasksQuery = Task.find(filter).populate('clientId', 'name avatarUrl initials');

  if (query.sort) {
    const sortOrder: SortOrder = query.order === 'asc' ? 1 : -1;
    tasksQuery = tasksQuery.sort({ [query.sort]: sortOrder });
    const tasks = await tasksQuery;
    res.json({ tasks });
    return;
  }

  const tasks = await tasksQuery;
  tasks.sort(defaultTaskSort);
  res.json({ tasks });
});

export const getTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await Task.findOne({ _id: req.params.id, userId: req.userId }).populate(
    'clientId',
    'name avatarUrl initials'
  );
  if (!task) throw ApiError.notFound('Tarefa não encontrada.');
  res.json({ task });
});

export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const data = createTaskSchema.parse(req.body);

  const task = await Task.create({
    ...data,
    clientId: data.clientId || undefined,
    userId: req.userId,
  });

  await task.populate('clientId', 'name avatarUrl initials');
  res.status(201).json({ task });
});

export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const data = updateTaskSchema.parse(req.body);

  const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
  if (!task) throw ApiError.notFound('Tarefa não encontrada.');

  Object.assign(task, data);
  if (data.clientId === '') task.clientId = undefined;

  await task.save();
  await task.populate('clientId', 'name avatarUrl initials');
  res.json({ task });
});

export const updateTaskStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = updateTaskStatusSchema.parse(req.body);

  const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
  if (!task) throw ApiError.notFound('Tarefa não encontrada.');

  task.status = status;
  task.completedAt = status === 'completed' ? new Date() : undefined;

  await task.save();
  await task.populate('clientId', 'name avatarUrl initials');
  res.json({ task });
});

export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!task) throw ApiError.notFound('Tarefa não encontrada.');
  res.status(204).send();
});
