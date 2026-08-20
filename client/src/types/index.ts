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
  dueDate?: string;
  priority: Priority;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
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
