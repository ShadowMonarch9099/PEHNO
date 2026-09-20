import { api } from './api';
import type { Campaign } from './types';

export const brandsApi = {
  campaigns: () => api.get<Campaign[]>('/brands/campaigns').then((r) => r.data),
  campaign: (id: string) => api.get<Campaign>(`/brands/campaigns/${id}`).then((r) => r.data),
  join: (id: string) => api.post<Campaign>(`/brands/campaigns/${id}/join`).then((r) => r.data),
  submit: (id: string, outfitId: string) => api.post<Campaign>(`/brands/campaigns/${id}/submit`, { outfit_id: outfitId }).then((r) => r.data),
  /** Returns the tracked URL to open. product_index undefined → the CTA. */
  click: (id: string, productIndex?: number) => api.post<{ url: string }>(`/brands/campaigns/${id}/click`, { product_index: productIndex ?? null }).then((r) => r.data.url),
};
