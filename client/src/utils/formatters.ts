import { format, isToday, isTomorrow, isYesterday, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return format(date, 'dd/MM/yyyy', { locale: ptBR });
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatRelativeDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isToday(date)) return 'Hoje';
  if (isTomorrow(date)) return 'Amanhã';
  if (isYesterday(date)) return 'Ontem';
  return formatDate(date);
}

export function isOverdue(dueDate: string | Date | undefined, status: string): boolean {
  if (!dueDate || status === 'completed') return false;
  const date = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  return isPast(date) && !isToday(date);
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/** Aplica máscara (99) 99999-9999 conforme os dígitos digitados. */
export function maskPhone(rawValue: string): string {
  const digits = rawValue.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

/**
 * Parses a `<input type="date">` value ("YYYY-MM-DD") as local midnight.
 * `new Date('2026-08-25')` would parse as UTC midnight, which in UTC-3
 * lands on Aug 24 21:00 local and displays as the wrong day.
 */
export function parseDateInput(value: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

/** Inverse of parseDateInput: a Date/ISO string to "YYYY-MM-DD" in local time. */
export function toDateInputValue(value: string | Date | undefined): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Combines a `<input type="date">` value with an optional `<input
 * type="time">` value into one local Date. Leaving the time blank lands the
 * result on local midnight, which hasExplicitTime treats as "no time set".
 */
export function parseDateTimeInput(dateValue: string, timeValue?: string): Date | undefined {
  const date = parseDateInput(dateValue);
  if (!date) return undefined;
  if (timeValue) {
    const [hours, minutes] = timeValue.split(':').map(Number);
    if (hours !== undefined && minutes !== undefined && !Number.isNaN(hours) && !Number.isNaN(minutes)) {
      date.setHours(hours, minutes, 0, 0);
    }
  }
  return date;
}

/** Inverse half of parseDateTimeInput: a Date/ISO string to "HH:mm" in local
 * time, or '' when there's no explicit time (see hasExplicitTime). */
export function toTimeInputValue(value: string | Date | undefined): string {
  if (!value || !hasExplicitTime(value)) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Whether a due date carries an explicit time-of-day rather than just a
 * calendar date. Dates built without a time (parseDateInput /
 * parseDateTimeInput with no timeValue) land exactly on local midnight, so
 * that's the signal — a task genuinely due at "00:00 sharp" isn't a
 * realistic case here, and treating it as date-only keeps the reminder
 * feature (which needs a real timestamp) from misfiring on plain due dates.
 */
export function hasExplicitTime(value: string | Date | undefined): boolean {
  if (!value) return false;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return false;
  return date.getHours() !== 0 || date.getMinutes() !== 0;
}

export function formatTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return format(date, 'HH:mm', { locale: ptBR });
}

/** Relative day label for a task due date, plus "às HH:mm" when it carries
 * an explicit time. */
export function formatTaskDue(value: string | Date): string {
  const label = formatRelativeDate(value);
  return hasExplicitTime(value) ? `${label} às ${formatTime(value)}` : label;
}

export type DeliveryUrgency = 'overdue' | 'today' | 'soon' | 'upcoming' | 'done';

export interface DeliveryCountdown {
  label: string;
  urgency: DeliveryUrgency;
  /** Whole days until delivery; negative once the date has passed. */
  days: number;
}

/**
 * How long until a client's delivery date, as a ready-to-render label.
 * Compares calendar days (not elapsed hours), so a delivery later today
 * reads "Entrega hoje" rather than "faltam 0 dias".
 */
export function getDeliveryCountdown(
  deliveryDate: string | Date | undefined,
  status?: string
): DeliveryCountdown | undefined {
  if (!deliveryDate) return undefined;

  const date = typeof deliveryDate === 'string' ? new Date(deliveryDate) : deliveryDate;
  if (Number.isNaN(date.getTime())) return undefined;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfDelivery = new Date(date);
  startOfDelivery.setHours(0, 0, 0, 0);

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const days = Math.round((startOfDelivery.getTime() - startOfToday.getTime()) / MS_PER_DAY);

  // A delivered project isn't late, however long ago the date was.
  if (status === 'completed') {
    return { label: 'Entregue', urgency: 'done', days };
  }

  if (days < 0) {
    const overdueBy = Math.abs(days);
    return {
      label: overdueBy === 1 ? 'Atrasado 1 dia' : `Atrasado ${overdueBy} dias`,
      urgency: 'overdue',
      days,
    };
  }
  if (days === 0) return { label: 'Entrega hoje', urgency: 'today', days };
  if (days === 1) return { label: 'Entrega amanhã', urgency: 'today', days };
  if (days <= 7) return { label: `Faltam ${days} dias`, urgency: 'soon', days };
  if (days <= 30) return { label: `Faltam ${days} dias`, urgency: 'upcoming', days };

  const months = Math.round(days / 30);
  return {
    label: months === 1 ? 'Falta 1 mês' : `Faltam ${months} meses`,
    urgency: 'upcoming',
    days,
  };
}

const HOME_HIDE_AFTER_MS = 24 * 60 * 60 * 1000;

/**
 * Completed items stay on Home for a day so a "just finished" client/task
 * is still visible right after wrapping up, then fall off to declutter —
 * they remain fully visible/manageable on the Clientes/Tarefas pages either
 * way, this only affects the Home "recent" lists.
 */
export function isHiddenFromHome(status: string, completedAt: string | Date | undefined): boolean {
  if (status !== 'completed' || !completedAt) return false;
  const date = typeof completedAt === 'string' ? new Date(completedAt) : completedAt;
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() > HOME_HIDE_AFTER_MS;
}

/**
 * Currency for tight spaces (chart axes, small tiles): "R$ 1,2 mil" instead
 * of "R$ 1.200,00". Full precision still lives in the tooltip and the tables.
 */
export function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/** "Ago" / "Ago 2026" — a month label for axes and grouping headers. */
export function formatMonthLabel(value: string | Date, withYear = false): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const label = format(date, withYear ? "MMM yyyy" : 'MMM', { locale: ptBR }).replace('.', '');
  return label.charAt(0).toUpperCase() + label.slice(1);
}
