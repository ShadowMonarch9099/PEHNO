/**
 * Axios client with bearer auth, single-flight refresh, and typed errors.
 */
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from './tokens';
import type { ApiErrorBody, TokenResponse } from './types';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string>;
  constructor(status: number, detail: string, errors?: Record<string, string>) {
    super(detail);
    this.status = status;
    this.errors = errors;
  }
}

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Called when a refresh fails — the app-level auth store subscribes to this.
let onSessionExpired: (() => void) | null = null;
export const setSessionExpiredHandler = (fn: () => void) => {
  onSessionExpired = fn;
};

api.interceptors.request.use(async (config) => {
  const tokens = await tokenStorage.get();
  if (tokens) config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  return config;
});

// Coalesce concurrent 401s into one refresh call.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const tokens = await tokenStorage.get();
  if (!tokens) return null;
  try {
    const { data } = await axios.post<TokenResponse>(`${API_BASE_URL}/auth/refresh`, {
      refresh_token: tokens.refreshToken,
    });
    await tokenStorage.set({ accessToken: data.access_token, refreshToken: data.refresh_token });
    return data.access_token;
  } catch {
    await tokenStorage.clear();
    onSessionExpired?.();
    return null;
  }
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as RetriableConfig | undefined;
    const isAuthRoute = original?.url?.startsWith('/auth/');

    if (error.response?.status === 401 && original && !original._retried && !isAuthRoute) {
      original._retried = true;
      refreshInFlight ??= refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
      const newToken = await refreshInFlight;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }

    const status = error.response?.status ?? 0;
    const body = error.response?.data;
    const detail =
      body?.detail ??
      (status === 0 ? 'Cannot reach the server. Check your connection.' : 'Something went wrong');
    throw new ApiError(status, detail, body?.errors);
  },
);
