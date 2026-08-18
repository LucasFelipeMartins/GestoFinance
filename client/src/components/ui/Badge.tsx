import { EntityStatus } from '@/types';
import { STATUS_META } from '@/utils/priority';

export function StatusBadge({ status }: { status: EntityStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center rounded-badge px-3 py-1 text-caption font-medium whitespace-nowrap"
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      {meta.label}
    </span>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  const toneClasses: Record<string, string> = {
    neutral: 'bg-muted-olive/20 text-evergreen',
    success: 'bg-success-light text-evergreen',
    warning: 'bg-warning/25 text-[#7A5B00]',
    danger: 'bg-danger/15 text-danger',
  };
  return (
    <span className={`inline-flex items-center rounded-badge px-3 py-1 text-caption font-medium ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
