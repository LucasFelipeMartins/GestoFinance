import { Request, Response } from 'express';
import { FilterQuery, SortOrder } from 'mongoose';
import { Client, ClientDocument } from '../models/Client';
import { Task } from '../models/Task';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { getInitials } from '../utils/initials';
import { saveAvatar, deleteAvatar } from '../utils/avatar';
import {
  createClientSchema,
  updateClientSchema,
  updateClientStatusSchema,
  clientQuerySchema,
} from '../validators/client.validators';

export const listClients = asyncHandler(async (req: Request, res: Response) => {
  const query = clientQuerySchema.parse(req.query);

  const filter: FilterQuery<ClientDocument> = { userId: req.userId };
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.search) {
    const regex = new RegExp(query.search.trim(), 'i');
    filter.$or = [{ name: regex }, { phone: regex }, { service: regex }];
  }

  const sortField = query.sort ?? 'createdAt';
  const sortOrder: SortOrder = query.order === 'asc' ? 1 : -1;
  const sort: Record<string, SortOrder> = { [sortField]: sortOrder };

  const clients = await Client.find(filter).sort(sort).lean();
  res.json({ clients });
});

export const getClient = asyncHandler(async (req: Request, res: Response) => {
  const client = await Client.findOne({ localId: req.params.id, userId: req.userId }).lean();
  if (!client) throw ApiError.notFound('Cliente não encontrado.');
  res.json({ client });
});

export const createClient = asyncHandler(async (req: Request, res: Response) => {
  const data = createClientSchema.parse(req.body);

  // Idempotent: the sync outbox may retry a create whose response was lost
  // in transit. Same localId for this user means "already created".
  const existing = await Client.findOne({ userId: req.userId, localId: data.localId }).lean();
  if (existing) {
    res.status(200).json({ client: existing });
    return;
  }

  const client = await Client.create({
    ...data,
    deliveryDate: data.deliveryDate || undefined,
    userId: req.userId,
    initials: getInitials(data.name),
  });

  res.status(201).json({ client });
});

export const updateClient = asyncHandler(async (req: Request, res: Response) => {
  const data = updateClientSchema.parse(req.body);

  const client = await Client.findOne({ localId: req.params.id, userId: req.userId });
  if (!client) throw ApiError.notFound('Cliente não encontrado.');

  // Last-write-wins: a stale push (older than what the server already has)
  // is silently ignored — the caller will re-pull and see the newer state.
  if (data.updatedAt < client.updatedAt) {
    res.json({ client });
    return;
  }

  Object.assign(client, data);
  // '' is the caller explicitly clearing the date (see validator).
  if (data.deliveryDate === '') client.deliveryDate = undefined;
  if (data.name) client.initials = getInitials(data.name);

  await client.save();
  res.json({ client });
});

export const updateClientStatus = asyncHandler(async (req: Request, res: Response) => {
  const data = updateClientStatusSchema.parse(req.body);

  const client = await Client.findOne({ localId: req.params.id, userId: req.userId });
  if (!client) throw ApiError.notFound('Cliente não encontrado.');

  if (data.updatedAt < client.updatedAt) {
    res.json({ client });
    return;
  }

  client.status = data.status;
  client.updatedAt = data.updatedAt;
  client.completedAt = data.status === 'completed' ? (data.completedAt ?? data.updatedAt) : undefined;
  await client.save();

  res.json({ client });
});

export const deleteClient = asyncHandler(async (req: Request, res: Response) => {
  const tasksAction = req.query.tasksAction === 'delete' ? 'delete' : 'unlink';

  const client = await Client.findOneAndDelete({ localId: req.params.id, userId: req.userId });
  if (!client) throw ApiError.notFound('Cliente não encontrado.');

  await deleteAvatar(client.avatarUrl);

  if (tasksAction === 'delete') {
    await Task.deleteMany({ clientId: client.localId, userId: req.userId });
  } else {
    await Task.updateMany({ clientId: client.localId, userId: req.userId }, { $unset: { clientId: '' } });
  }

  res.status(204).send();
});

export const uploadClientAvatar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('Nenhuma imagem enviada.');

  const client = await Client.findOne({ localId: req.params.id, userId: req.userId });
  if (!client) throw ApiError.notFound('Cliente não encontrado.');

  await deleteAvatar(client.avatarUrl);
  client.avatarUrl = await saveAvatar(req.file.buffer, client.localId);
  client.updatedAt = new Date();
  await client.save();

  res.json({ client });
});
