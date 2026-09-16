import { Router } from 'express';
import authRoutes from './auth.routes';
import clientRoutes from './client.routes';
import taskRoutes from './task.routes';
import financeRoutes from './finance.routes';
import goalRoutes from './goal.routes';
import boxRoutes from './box.routes';
import billingRoutes from './billing.routes';
import adminRoutes from './admin.routes';
import { requireAuth } from '../middleware/requireAuth';
import { requirePlan } from '../middleware/requirePlan';

const router = Router();

router.use('/auth', authRoutes);
router.use('/billing', billingRoutes);
router.use('/admin', adminRoutes);

// Everything that holds the person's data needs a live plan (trial, paid,
// or exempt) besides a session.
router.use('/clients', requireAuth, requirePlan, clientRoutes);
router.use('/tasks', requireAuth, requirePlan, taskRoutes);
router.use('/finance', requireAuth, requirePlan, financeRoutes);
router.use('/goals', requireAuth, requirePlan, goalRoutes);
router.use('/investment-boxes', requireAuth, requirePlan, boxRoutes);

export default router;
