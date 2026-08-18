import { Router } from 'express';
import {
  listClients,
  getClient,
  createClient,
  updateClient,
  updateClientStatus,
  deleteClient,
  uploadClientAvatar,
} from '../controllers/client.controller';
import { uploadAvatar } from '../middleware/uploadAvatar';

const router = Router();

router.get('/', listClients);
router.get('/:id', getClient);
router.post('/', createClient);
router.put('/:id', updateClient);
router.patch('/:id/status', updateClientStatus);
router.delete('/:id', deleteClient);
router.post('/:id/avatar', uploadAvatar, uploadClientAvatar);

export default router;
