import { api } from './api';
import { User } from '@/types';

export interface RequestRegisterCodePayload {
  name: string;
  email: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  /** The 6-digit code e-mailed by requestRegisterCode. */
  code: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

interface AuthResponse {
  user: User;
  /** Only meaningful for the native app — see utils/tokenStorage.ts. */
  token?: string;
}

export interface MailSentResponse {
  message: string;
  expiresInMinutes: number;
  /** Local development only (no mail provider configured): the code itself. */
  devCode?: string;
  /** Local development only: the reset link itself. */
  devLink?: string;
}

export const authService = {
  async requestRegisterCode(payload: RequestRegisterCodePayload): Promise<MailSentResponse> {
    const { data } = await api.post<MailSentResponse>('/auth/register/request-code', payload);
    return data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/register', payload);
    return data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', payload);
    return data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async me(): Promise<User> {
    const { data } = await api.get<{ user: User }>('/auth/me');
    return data.user;
  },

  async forgotPassword(email: string): Promise<MailSentResponse> {
    const { data } = await api.post<MailSentResponse>('/auth/forgot-password', { email });
    return data;
  },

  async checkResetToken(token: string): Promise<{ valid: boolean; email: string }> {
    const { data } = await api.get<{ valid: boolean; email: string }>('/auth/reset-password', {
      params: { token },
    });
    return data;
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/reset-password', { token, password });
    return data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return data;
  },
};
