import { Router } from 'express';
import {
  listGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  createGoalContribution,
  updateGoalContribution,
  deleteGoalContribution,
} from '../controllers/goal.controller';

const router = Router();

router.get('/', listGoals);
router.post('/', createGoal);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);

// Deposits are their own records (see the model), so they get their own paths
// rather than nesting under a goal id.
router.post('/contributions/new', createGoalContribution);
router.put('/contributions/:id', updateGoalContribution);
router.delete('/contributions/:id', deleteGoalContribution);

export default router;
