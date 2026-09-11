import { CalendarClock, CalendarCheck, AlertTriangle } from 'lucide-react';
import { getDeliveryCountdown, formatDate, DeliveryUrgency } from '@/utils/formatters';
import { EntityStatus } from '@/types';

/** Themed through CSS variables — see src/styles/index.css. */
const URGENCY_STYLES: Record<DeliveryUrgency, { color: string; bg: string }> = {
  overdue: { color: 'var(--delivery-overdue-fg)', bg: 'var(--delivery-overdue-bg)' },
  today: { color: 'var(--delivery-today-fg)', bg: 'var(--delivery-today-bg)' },
  soon: { color: 'var(--delivery-soon-fg)', bg: 'var(--delivery-soon-bg)' },
  upcoming: { color: 'var(--delivery-upcoming-fg)', bg: 'var(--delivery-upcoming-bg)' },
  done: { color: 'var(--delivery-done-fg)', bg: 'var(--delivery-done-bg)' },
};

interface DeliveryBadgeProps {
  deliveryDate?: string;
  status?: EntityStatus;
  /** Shows the actual date next to the countdown — for roomier layouts. */
  showDate?: boolean;
}

export function DeliveryBadge({ deliveryDate, status, showDate }: DeliveryBadgeProps) {
  const countdown = getDeliveryCountdown(deliveryDate, status);

  if (!countdown) {
    return <span className="text-caption text-text-secondary">Sem prazo</span>;
  }

  const style = URGENCY_STYLES[countdown.urgency];
  const Icon =
    countdown.urgency === 'overdue'
      ? AlertTriangle
      : countdown.urgency === 'done'
        ? CalendarCheck
        : CalendarClock;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-flex items-center gap-1 rounded-badge px-2.5 py-1 text-caption font-medium whitespace-nowrap"
        style={{ color: style.color, backgroundColor: style.bg }}
      >
        <Icon size={13} aria-hidden="true" />
        {countdown.label}
      </span>
      {showDate && deliveryDate && (
        <span className="text-caption text-text-secondary whitespace-nowrap">
          {formatDate(deliveryDate)}
        </span>
      )}
    </span>
  );
}
