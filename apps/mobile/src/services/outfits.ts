import { api } from './api';
import type { Outfit, OutfitList, OutfitOptions } from './types';

export const outfitsApi = {
  daily: (regenerate = false) =>
    api.get<OutfitOptions>('/outfits/daily', { params: { regenerate } }).then((r) => r.data),
  generate: (occasion: string, festival?: string, limit = 3) =>
    api.post<OutfitOptions>('/outfits/generate', { occasion, festival, limit }).then((r) => r.data),
  get: (id: string) => api.get<Outfit>(`/outfits/${id}`).then((r) => r.data),
  feedback: (id: string, value: 1 | -1) =>
    api.post<Outfit>(`/outfits/${id}/feedback`, { value }).then((r) => r.data),
  rate: (id: string, rating: 1 | 2 | 3 | 4 | 5) => api.post<Outfit>(`/outfits/${id}/rate`, { rating }).then((r) => r.data),
  save: (id: string) => api.post<Outfit>(`/outfits/${id}/save`).then((r) => r.data),
  unsave: (id: string) => api.delete<Outfit>(`/outfits/${id}/save`).then((r) => r.data),
  wear: (id: string) => api.post<Outfit>(`/outfits/${id}/wear`).then((r) => r.data),
  history: (page = 1) => api.get<OutfitList>('/outfits/history', { params: { page } }).then((r) => r.data),
  saved: (page = 1) => api.get<OutfitList>('/outfits/saved', { params: { page } }).then((r) => r.data),
};
