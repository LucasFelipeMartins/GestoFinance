import { Router } from 'express';
import {
  listFinanceEntries,
  getFinanceEntry,
  createFinanceEntry,
  updateFinanceEntry,
  deleteFinanceEntry,
} from '../controllers/finance.controller';

const router = Router();

router.get('/', listFinanceEntries);
router.get('/:id', getFinanceEntry);
router.post('/', createFinanceEntry);
router.put('/:id', updateFinanceEntry);
router.delete('/:id', deleteFinanceEntry);

export default router;
