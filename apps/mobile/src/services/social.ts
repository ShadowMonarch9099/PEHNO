import { api } from './api';
import type { FeedItem, ShareState } from './types';

export const socialApi = {
  share: (outfitId: string) => api.post<ShareState>(`/social/share-card/${outfitId}`).then((r) => r.data),
  unshare: (outfitId: string) => api.delete<ShareState>(`/social/share-card/${outfitId}`).then((r) => r.data),
  feed: (city?: string) => api.get<FeedItem[]>('/social/feed/city', { params: { city } }).then((r) => r.data),
  like: (outfitId: string) => api.post<ShareState>(`/social/like/${outfitId}`).then((r) => r.data),
  unlike: (outfitId: string) => api.delete<ShareState>(`/social/like/${outfitId}`).then((r) => r.data),
};
