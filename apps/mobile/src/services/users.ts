import { api } from './api';
import type { User, UserStats, UserUpdate } from './types';

export const usersApi = {
  me: () => api.get<User>('/users/me').then((r) => r.data),
  update: (patch: UserUpdate) => api.put<User>('/users/me', patch).then((r) => r.data),
  stats: () => api.get<UserStats>('/users/me/stats').then((r) => r.data),
};
