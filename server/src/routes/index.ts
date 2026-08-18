import { Router } from 'express';
import authRoutes from './auth.routes';
import clientRoutes from './client.routes';
import taskRoutes from './task.routes';
import dashboardRoutes from './dashboard.routes';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.use('/auth', authRoutes);
router.use('/clients', requireAuth, clientRoutes);
router.use('/tasks', requireAuth, taskRoutes);
router.use('/dashboard', requireAuth, dashboardRoutes);

export default router;
