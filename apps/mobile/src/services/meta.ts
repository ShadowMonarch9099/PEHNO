import { api } from './api';
import type { City, WardrobeOptions } from './types';

export const metaApi = {
  wardrobeOptions: () => api.get<WardrobeOptions>('/meta/wardrobe-options').then((r) => r.data),
  cities: () => api.get<City[]>('/meta/cities').then((r) => r.data),
};
