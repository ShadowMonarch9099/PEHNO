/**
 * PEHNO API Client — Axios instance with auth interceptors
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request Interceptor — attach JWT ───────────────────────────────────────────
apiClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response Interceptor — handle 401 with token refresh ──────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        await SecureStore.setItemAsync('access_token', data.access_token);
        await SecureStore.setItemAsync('refresh_token', data.refresh_token);

        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return apiClient(originalRequest);
      } catch {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        // Trigger logout — handled by store
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;

// ── API Functions ──────────────────────────────────────────────────────────────

export const authApi = {
  sendOtp: (phone: string) => apiClient.post('/auth/send-otp', { phone }),
  verifyOtp: (phone: string, otp: string) => apiClient.post('/auth/verify-otp', { phone, otp }),
  refresh: (refresh_token: string) => apiClient.post('/auth/refresh', { refresh_token }),
  logout: () => apiClient.post('/auth/logout'),
};

export const userApi = {
  getMe: () => apiClient.get('/users/me'),
  updateMe: (data: Record<string, unknown>) => apiClient.put('/users/me', data),
  getStats: () => apiClient.get('/users/me/stats'),
};

export const wardrobeApi = {
  upload: (formData: FormData) =>
    apiClient.post('/wardrobe/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  list: (params?: Record<string, string>) => apiClient.get('/wardrobe', { params }),
  getOne: (id: string) => apiClient.get(`/wardrobe/${id}`),
  update: (id: string, data: Record<string, unknown>) => apiClient.put(`/wardrobe/${id}`, data),
  delete: (id: string) => apiClient.delete(`/wardrobe/${id}`),
  logWear: (id: string) => apiClient.post(`/wardrobe/${id}/wear`),
};

export const outfitApi = {
  getDaily: () => apiClient.get('/outfits/daily'),
  generate: (data: { occasion: string; festival?: string }) =>
    apiClient.post('/outfits/generate', data),
  getHistory: (page = 1) => apiClient.get('/outfits/history', { params: { page } }),
  rate: (id: string, rating: number) => apiClient.post(`/outfits/${id}/rate`, { rating }),
  save: (id: string) => apiClient.post(`/outfits/${id}/save`),
  getSaved: () => apiClient.get('/outfits/saved'),
};

export const festivalApi = {
  getUpcoming: () => apiClient.get('/festivals/upcoming'),
  getDetail: (slug: string) => apiClient.get(`/festivals/${slug}`),
  getNavratriToday: () => apiClient.get('/festivals/navratri/today'),
};
