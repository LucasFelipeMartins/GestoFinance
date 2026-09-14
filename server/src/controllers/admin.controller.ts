import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { FreeAccount } from '../models/Billing';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { isAdminEmail } from '../services/billing';

/** Only the e-mails in ADMIN_EMAILS get past this. */
export const requireAdmin = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const user = await User.findById(req.userId).lean();
  if (!user || !isAdminEmail(user.email)) {
    throw ApiError.forbidden('Somente o administrador pode fazer isso.');
  }
  next();
});

export const listFreeAccounts = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await FreeAccount.find().sort({ createdAt: -1 }).lean();
  // Say which of them already have an account, so the list is informative.
  const users = await User.find({ email: { $in: rows.map((row) => row.email) } })
    .select('email name')
    .lean();
  const byEmail = new Map(users.map((user) => [user.email, user.name]));

  res.json({
    accounts: rows.map((row) => ({
      email: row.email,
      note: row.note,
      createdAt: row.createdAt,
      userName: byEmail.get(row.email),
    })),
  });
});

const addSchema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
  note: z.string().trim().max(120).optional(),
});

export const addFreeAccount = asyncHandler(async (req: Request, res: Response) => {
  const data = addSchema.parse(req.body);
  const admin = await User.findById(req.userId).lean();

  const row = await FreeAccount.findOneAndUpdate(
    { email: data.email },
    { $set: { note: data.note }, $setOnInsert: { email: data.email, addedBy: admin?.email ?? 'admin' } },
    { upsert: true, new: true }
  );
  res.status(201).json({ account: { email: row.email, note: row.note, createdAt: row.createdAt } });
});

export const removeFreeAccount = asyncHandler(async (req: Request, res: Response) => {
  const email = String(req.params.email ?? '').trim().toLowerCase();
  if (isAdminEmail(email)) {
    throw ApiError.badRequest('Administradores são sempre gratuitos (ADMIN_EMAILS).');
  }
  await FreeAccount.deleteOne({ email });
  res.status(204).send();
});
