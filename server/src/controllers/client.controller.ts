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
  const client = await Client.findOne({ _id: req.params.id, userId: req.userId }).lean();
  if (!client) throw ApiError.notFound('Cliente não encontrado.');
  res.json({ client });
});

export const createClient = asyncHandler(async (req: Request, res: Response) => {
  const data = createClientSchema.parse(req.body);

  const client = await Client.create({
    ...data,
    userId: req.userId,
    initials: getInitials(data.name),
  });

  res.status(201).json({ client });
});

export const updateClient = asyncHandler(async (req: Request, res: Response) => {
  const data = updateClientSchema.parse(req.body);

  const client = await Client.findOne({ _id: req.params.id, userId: req.userId });
  if (!client) throw ApiError.notFound('Cliente não encontrado.');

  Object.assign(client, data);
  if (data.name) client.initials = getInitials(data.name);

  await client.save();
  res.json({ client });
});

export const updateClientStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = updateClientStatusSchema.parse(req.body);

  const client = await Client.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { status },
    { new: true }
  );
  if (!client) throw ApiError.notFound('Cliente não encontrado.');

  res.json({ client });
});

export const deleteClient = asyncHandler(async (req: Request, res: Response) => {
  const tasksAction = req.query.tasksAction === 'delete' ? 'delete' : 'unlink';

  const client = await Client.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!client) throw ApiError.notFound('Cliente não encontrado.');

  await deleteAvatar(client.avatarUrl);

  if (tasksAction === 'delete') {
    await Task.deleteMany({ clientId: client._id, userId: req.userId });
  } else {
    await Task.updateMany({ clientId: client._id, userId: req.userId }, { $unset: { clientId: '' } });
  }

  res.status(204).send();
});

export const uploadClientAvatar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('Nenhuma imagem enviada.');

  const client = await Client.findOne({ _id: req.params.id, userId: req.userId });
  if (!client) throw ApiError.notFound('Cliente não encontrado.');

  await deleteAvatar(client.avatarUrl);
  client.avatarUrl = await saveAvatar(req.file.buffer, String(client._id));
  await client.save();

  res.json({ client });
});
