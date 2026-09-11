import { Priority, EntityStatus } from '@/types';

/**
 * Badge palettes come from CSS variables (src/styles/index.css) so the
 * tinted backgrounds flip with the theme: a pastel that reads fine on white
 * turns into a glowing slab on a dark surface. The saturated priority hues
 * themselves work on both and stay literal.
 */
export const PRIORITY_META: Record<
  Priority,
  { label: string; accessibleLabel: string; color: string; bg: string }
> = {
  critical: { label: 'Máxima', accessibleLabel: 'Prioridade máxima', color: '#E53935', bg: 'var(--prio-critical-bg)' },
  high: { label: 'Alta', accessibleLabel: 'Prioridade alta', color: '#FB8C00', bg: 'var(--prio-high-bg)' },
  medium: { label: 'Média', accessibleLabel: 'Prioridade média', color: '#F4C20D', bg: 'var(--prio-medium-bg)' },
  low: { label: 'Baixa', accessibleLabel: 'Prioridade baixa', color: '#7E57C2', bg: 'var(--prio-low-bg)' },
  'very-low': {
    label: 'Muito baixa',
    accessibleLabel: 'Prioridade muito baixa',
    color: '#1E88E5',
    bg: 'var(--prio-very-low-bg)',
  },
};

export const STATUS_META: Record<EntityStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendente', color: 'var(--status-pending-fg)', bg: 'var(--status-pending-bg)' },
  'in-progress': { label: 'Em andamento', color: 'var(--status-progress-fg)', bg: 'var(--status-progress-bg)' },
  completed: { label: 'Concluído', color: 'var(--status-done-fg)', bg: 'var(--status-done-bg)' },
};
