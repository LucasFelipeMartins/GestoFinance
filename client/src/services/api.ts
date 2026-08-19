import axios from 'axios';
import { getToken } from '@/utils/tokenStorage';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
});

// Web authenticates via the httpOnly cookie (withCredentials above already
// sends it). The native app has no reliable cross-site cookie, so it also
// carries a bearer token — attach it here when one is stored.
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ApiErrorPayload {
  message: string;
  fields?: Record<string, string>;
}

export function getApiErrorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    return error.response?.data?.message ?? fallback;
  }
  return fallback;
}

export function getApiFieldErrors(error: unknown): Record<string, string> | undefined {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    return error.response?.data?.fields;
  }
  return undefined;
}

export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}
