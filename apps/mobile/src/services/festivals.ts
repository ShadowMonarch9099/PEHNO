import { api } from './api';
import type { Festival, FestivalDetail, NavratriToday } from './types';

export const festivalsApi = {
  upcoming: (limit = 5) => api.get<Festival[]>('/festivals/upcoming', { params: { limit } }).then((r) => r.data),
  detail: (slug: string) => api.get<FestivalDetail>(`/festivals/${slug}`).then((r) => r.data),
  navratriToday: () => api.get<NavratriToday>('/festivals/navratri/today').then((r) => r.data),
};
