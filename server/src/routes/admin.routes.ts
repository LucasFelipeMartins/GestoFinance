import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireAdmin, listFreeAccounts, addFreeAccount, removeFreeAccount } from '../controllers/admin.controller';

const router = Router();

router.use(requireAuth, requireAdmin);
router.get('/free-accounts', listFreeAccounts);
router.post('/free-accounts', addFreeAccount);
router.delete('/free-accounts/:email', removeFreeAccount);

export default router;
