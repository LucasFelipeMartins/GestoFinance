import { CalendarClock, CalendarCheck, AlertTriangle } from 'lucide-react';
import { getDeliveryCountdown, formatDate, DeliveryUrgency } from '@/utils/formatters';
import { EntityStatus } from '@/types';

const URGENCY_STYLES: Record<DeliveryUrgency, { color: string; bg: string }> = {
  overdue: { color: '#D93A3A', bg: '#FDECEC' },
  today: { color: '#B26B00', bg: '#FFF2E2' },
  soon: { color: '#8A6D1D', bg: '#FEF7DA' },
  upcoming: { color: '#2F6B34', bg: '#DCF3DA' },
  done: { color: '#66705F', bg: '#EFF2ED' },
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
