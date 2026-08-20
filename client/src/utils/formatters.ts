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
