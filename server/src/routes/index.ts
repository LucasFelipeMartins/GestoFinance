import { Router } from 'express';
import authRoutes from './auth.routes';
import clientRoutes from './client.routes';
import taskRoutes from './task.routes';
import financeRoutes from './finance.routes';
import goalRoutes from './goal.routes';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.use('/auth', authRoutes);
router.use('/clients', requireAuth, clientRoutes);
router.use('/tasks', requireAuth, taskRoutes);
router.use('/finance', requireAuth, financeRoutes);
router.use('/goals', requireAuth, goalRoutes);

export default router;
