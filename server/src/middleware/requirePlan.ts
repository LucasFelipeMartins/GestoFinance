import { NextFunction, Request, Response } from 'express';
import { User } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { computeAccess, ensureTrial } from '../services/billing';

/**
 * Guards the data routes: past the trial and unpaid, the API answers 402 and
 * the app shows the plan page. Sits after requireAuth (which already loaded
 * the user).
 */
export const requirePlan = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const user = req.user ?? (await User.findById(req.userId));
  if (!user) throw ApiError.unauthorized();

  await ensureTrial(user);
  const access = await computeAccess(user);
  if (!access.allowed) {
    throw new ApiError(402, 'Seu período de acesso terminou. Renove para continuar usando o GestorFinance.');
  }
  next();
});
