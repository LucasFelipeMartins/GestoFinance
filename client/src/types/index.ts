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

export interface Client {
  _id: string;
  name: string;
  phone: string;
  service: string;
  price: number;
  avatarUrl?: string;
  initials: string;
  priority: Priority;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TaskClientRef {
  _id: string;
  name: string;
  avatarUrl?: string;
  initials: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  clientId?: TaskClientRef | string;
  dueDate?: string;
  priority: Priority;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
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
  recentTasks: Task[];
}
