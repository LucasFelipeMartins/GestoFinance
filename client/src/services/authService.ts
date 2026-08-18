import { api } from './api';
import { User } from '@/types';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<User> {
    const { data } = await api.post<{ user: User }>('/auth/register', payload);
    return data.user;
  },

  async login(payload: LoginPayload): Promise<User> {
    const { data } = await api.post<{ user: User }>('/auth/login', payload);
    return data.user;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async me(): Promise<User> {
    const { data } = await api.get<{ user: User }>('/auth/me');
    return data.user;
  },
};
