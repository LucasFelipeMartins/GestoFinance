import { ReactNode } from 'react';
import { EntityStatus } from '@/types';
import { STATUS_META } from '@/utils/priority';

export function StatusBadge({ status }: { status: EntityStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-badge px-3 py-1 text-caption font-medium"
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      {meta.label}
    </span>
  );
}

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-tint text-brand',
  success: 'bg-finance-income-soft text-finance-income',
  warning: 'bg-warning/25 text-warning-fg',
  danger: 'bg-danger/15 text-danger',
  info: 'bg-finance-investment-soft text-finance-investment',
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-badge px-3 py-1 text-caption font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
