import { api } from './api';
import type { BodyTypeInfo, City, Gender, WardrobeOptions } from './types';

export const metaApi = {
  wardrobeOptions: () => api.get<WardrobeOptions>('/meta/wardrobe-options').then((r) => r.data),
  cities: () => api.get<City[]>('/meta/cities').then((r) => r.data),
  bodyTypes: (gender?: Gender) => api.get<BodyTypeInfo[]>('/meta/body-types', { params: { gender } }).then((r) => r.data),
};
