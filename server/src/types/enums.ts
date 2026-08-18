export const PRIORITIES = ['critical', 'high', 'medium', 'low', 'very-low'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = ['pending', 'in-progress', 'completed'] as const;
export type EntityStatus = (typeof STATUSES)[number];

export const PRIORITY_RANK: Record<Priority, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
  'very-low': 5,
};
