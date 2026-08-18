import { Priority, EntityStatus } from '@/types';

export const PRIORITY_META: Record<
  Priority,
  { label: string; accessibleLabel: string; color: string; bg: string }
> = {
  critical: { label: 'Máxima', accessibleLabel: 'Prioridade máxima', color: '#E53935', bg: '#FDECEC' },
  high: { label: 'Alta', accessibleLabel: 'Prioridade alta', color: '#FB8C00', bg: '#FFF2E2' },
  medium: { label: 'Média', accessibleLabel: 'Prioridade média', color: '#F4C20D', bg: '#FEF7DA' },
  low: { label: 'Baixa', accessibleLabel: 'Prioridade baixa', color: '#7E57C2', bg: '#F1ECFA' },
  'very-low': { label: 'Muito baixa', accessibleLabel: 'Prioridade muito baixa', color: '#1E88E5', bg: '#E7F2FC' },
};

export const STATUS_META: Record<EntityStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendente', color: '#8A6D1D', bg: '#FEF3D6' },
  'in-progress': { label: 'Em andamento', color: '#1E6E8C', bg: '#DFF1F7' },
  completed: { label: 'Concluído', color: '#2F6B34', bg: '#DCF3DA' },
};
