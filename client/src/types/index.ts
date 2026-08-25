export type Priority = 'critical' | 'high' | 'medium' | 'low' | 'very-low';

export type EntityStatus = 'pending' | 'in-progress' | 'completed';

export const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'critical', label: 'Máxima' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
  { value: 'very-low', label: 'Muito baixa' },
];

export const STATUS_OPTIONS: { value: EntityStatus; label: string }[] = [
  { value: 'pending', label: 'Pendente' },
  { value: 'in-progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluído' },
];

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

/**
 * `id` is a UUID generated on the device at creation time — it's the
 * canonical identifier everywhere (local DB, API, routes), not a MongoDB
 * _id. That's what makes offline creation possible: the id never changes
 * once assigned, whether or not the record has synced yet.
 */
export interface Client {
  id: string;
  name: string;
  phone: string;
  service: string;
  price: number;
  avatarUrl?: string;
  initials: string;
  priority: Priority;
  status: EntityStatus;
  /** Agreed delivery date for this client's project (optional). */
  deliveryDate?: string;
  createdAt: string;
  updatedAt: string;
  /** Set when status becomes 'completed' — drives the Home 24h auto-hide. */
  completedAt?: string;
}

export interface TaskClientRef {
  id: string;
  name: string;
  avatarUrl?: string;
  initials: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  /** References Client.id. Resolve display info via `client` (joined
   * locally), not by fetching — it must work offline. */
  clientId?: string;
  /** May carry a real time-of-day, not just a calendar date — local
   * midnight means "no time set" (see hasExplicitTime in formatters.ts). */
  dueDate?: string;
  priority: Priority;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  /** Opted in to a reminder notification 5h before dueDate. */
  reminderEnabled?: boolean;
}

export interface TaskWithClient extends Task {
  client?: TaskClientRef;
}

export interface DashboardSummary {
  clients: {
    total: number;
    completed: number;
    pending: number;
    completionRate: number;
  };
  tasks: {
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
    overdue: number;
    completionRate: number;
  };
  recentClients: Client[];
  recentTasks: TaskWithClient[];
}

/* ------------------------------------------------------------------ */
/* Finanças                                                            */
/* ------------------------------------------------------------------ */

/** The three ledgers. One entity, one table, one sync path — `kind` is the
 * discriminator and each page is just a filtered view of it. */
export type FinanceKind = 'income' | 'expense' | 'investment';

/** How a despesa gets paid. `card` is the only one that carries parcelas. */
export type PaymentMethod = 'pix' | 'card';

export const FINANCE_KIND_OPTIONS: { value: FinanceKind; label: string }[] = [
  { value: 'income', label: 'Lucro' },
  { value: 'expense', label: 'Despesa' },
  { value: 'investment', label: 'Investimento' },
];

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'pix', label: 'Pix' },
  { value: 'card', label: 'Cartão' },
];

/** Suggestions only — the field stays free text so nobody is boxed in. */
export const FINANCE_CATEGORIES: Record<FinanceKind, string[]> = {
  income: ['Serviço', 'Venda', 'Manutenção', 'Consultoria', 'Recorrência', 'Outros'],
  expense: ['Fornecedor', 'Ferramentas', 'Assinaturas', 'Impostos', 'Transporte', 'Moradia', 'Outros'],
  investment: ['CDB', 'Tesouro Direto', 'LCI/LCA', 'Fundo', 'Poupança', 'Outros'],
};

/**
 * Where a lançamento came from.
 *
 * `manual` is everything the user typed into the Finanças forms — vendas,
 * salários, contas, aplicações. `client` marks the receita that a concluded
 * Client produces on its own: it is derived at read time from the client's
 * price, never stored, so it always matches the client and disappears if the
 * client is reopened or removed. Derived entries are read-only here — the
 * client is where you edit them.
 */
export type FinanceSource = 'manual' | 'client';

export interface FinanceEntry {
  id: string;
  kind: FinanceKind;
  description: string;
  /** Always the FULL value in BRL, never a parcela — the monthly share of a
   * card purchase is derived (amount / installments). */
  amount: number;
  /** income → recebido em; expense → vence em; investment → aplicado em. */
  date: string;
  category?: string;
  notes?: string;
  /** The Client that produced this receita. Only set on derived entries. */
  clientId?: string;
  /** Absent on stored rows (they are all manual); set on derived ones. */
  source?: FinanceSource;

  // --- expense-only ---
  paid: boolean;
  paidAt?: string;
  paymentMethod?: PaymentMethod;
  /** 1 for pix or à vista; > 1 spreads `amount` over that many months. */
  installments?: number;

  // --- investment-only ---
  /** Percentage OF the CDI (e.g. 110 = 110% do CDI), how Brazilian fixed
   * income is actually quoted. */
  cdiPercent?: number;

  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Metas                                                               */
/* ------------------------------------------------------------------ */

/** Something the user is saving toward: "Viajar", "Notebook novo". */
export interface Goal {
  id: string;
  title: string;
  /** How much they want to have put aside by `targetDate`. */
  targetAmount: number;
  /**
   * When they want to get there.
   *
   * Stored as a real date rather than the "5 meses" the form asks for: a
   * stored duration would silently mean something different tomorrow, while
   * a date keeps meaning the same day forever.
   */
  targetDate: string;
  notes?: string;
  /** Set when the target is reached, so it can be celebrated once and then
   * stop competing for attention on Home. */
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * One deposit toward a goal.
 *
 * Deliberately its own record rather than a running total on the Goal: two
 * devices each adding a deposit while offline both survive, because each is
 * an independent create. A single `savedAmount` field would resolve
 * last-write-wins and quietly drop one of them.
 */
export interface GoalContribution {
  id: string;
  /** References Goal.id. */
  goalId: string;
  /** Negative is allowed on purpose — it is how a mistaken deposit gets
   * undone without erasing the history of what happened. */
  amount: number;
  date: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/** A goal with its deposits already folded in — what every view renders. */
export interface GoalProgress {
  goal: Goal;
  /** Newest first. */
  contributions: GoalContribution[];
  saved: number;
  remaining: number;
  /** 0..1, clamped — a goal that overshot still reads as full, not 130%. */
  percent: number;
  isComplete: boolean;
  isOverdue: boolean;
  /** Whole months left, floored at zero. */
  monthsLeft: number;
  /** What still needs to go in each month to land on time. */
  monthlyNeeded: number;
}
