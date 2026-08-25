import { api } from './api';
import { Goal, GoalContribution } from '@/types';

/** What we send the server — mirrors server/src/validators/goal.validators.ts. */
export interface GoalCreatePayload {
  localId: string;
  title: string;
  targetAmount: number;
  targetDate: string;
  notes?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type GoalUpdatePayload = Partial<Omit<GoalCreatePayload, 'localId' | 'createdAt'>> & {
  updatedAt: string;
};

export interface GoalContributionCreatePayload {
  localId: string;
  goalId: string;
  amount: number;
  date: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export type GoalContributionUpdatePayload = Partial<
  Omit<GoalContributionCreatePayload, 'localId' | 'createdAt'>
> & { updatedAt: string };

interface ApiGoal extends Omit<Goal, 'id'> {
  localId: string;
}

interface ApiGoalContribution extends Omit<GoalContribution, 'id'> {
  localId: string;
}

function goalFromApi(raw: ApiGoal): Goal {
  const { localId, ...rest } = raw;
  return { id: localId, ...rest };
}

function contributionFromApi(raw: ApiGoalContribution): GoalContribution {
  const { localId, ...rest } = raw;
  return { id: localId, ...rest };
}

export const goalService = {
  /** Goals and deposits come back together: progress is meaningless without
   * both, so one round trip keeps them from arriving out of step. */
  async list(): Promise<{ goals: Goal[]; contributions: GoalContribution[] }> {
    const { data } = await api.get<{ goals: ApiGoal[]; contributions: ApiGoalContribution[] }>(
      '/goals'
    );
    return {
      goals: data.goals.map(goalFromApi),
      contributions: data.contributions.map(contributionFromApi),
    };
  },

  async create(payload: GoalCreatePayload): Promise<Goal> {
    const { data } = await api.post<{ goal: ApiGoal }>('/goals', payload);
    return goalFromApi(data.goal);
  },

  async update(id: string, payload: GoalUpdatePayload): Promise<Goal> {
    const { data } = await api.put<{ goal: ApiGoal }>(`/goals/${id}`, payload);
    return goalFromApi(data.goal);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/goals/${id}`);
  },

  async createContribution(payload: GoalContributionCreatePayload): Promise<GoalContribution> {
    const { data } = await api.post<{ contribution: ApiGoalContribution }>(
      '/goals/contributions/new',
      payload
    );
    return contributionFromApi(data.contribution);
  },

  async updateContribution(
    id: string,
    payload: GoalContributionUpdatePayload
  ): Promise<GoalContribution> {
    const { data } = await api.put<{ contribution: ApiGoalContribution }>(
      `/goals/contributions/${id}`,
      payload
    );
    return contributionFromApi(data.contribution);
  },

  async removeContribution(id: string): Promise<void> {
    await api.delete(`/goals/contributions/${id}`);
  },
};
