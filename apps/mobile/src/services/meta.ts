import { api } from './api';
import type { BodyTypeInfo, City, Gender, WardrobeOptions } from './types';

export const metaApi = {
  wardrobeOptions: (lang?: string) => api.get<WardrobeOptions>('/meta/wardrobe-options', { params: lang && lang !== 'en' ? { lang } : undefined }).then((r) => r.data),
  cities: () => api.get<City[]>('/meta/cities').then((r) => r.data),
  bodyTypes: (gender?: Gender) => api.get<BodyTypeInfo[]>('/meta/body-types', { params: { gender } }).then((r) => r.data),
};
