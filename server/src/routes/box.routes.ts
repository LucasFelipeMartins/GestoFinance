import { Router } from 'express';
import { listBoxes, createBox, updateBox, deleteBox } from '../controllers/box.controller';

const router = Router();

router.get('/', listBoxes);
router.post('/', createBox);
router.put('/:id', updateBox);
router.delete('/:id', deleteBox);

export default router;
