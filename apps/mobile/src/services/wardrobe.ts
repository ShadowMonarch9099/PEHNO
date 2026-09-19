import { api } from './api';
import type { Garment, GarmentFilters, GarmentList, GarmentUpdate, RoiReport, Underutilised, UploadResult } from './types';

export interface LocalPhoto {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

export const wardrobeApi = {
  list: (filters: GarmentFilters = {}) =>
    api.get<GarmentList>('/wardrobe', { params: filters }).then((r) => r.data),
  get: (id: string) => api.get<Garment>(`/wardrobe/${id}`).then((r) => r.data),
  update: (id: string, patch: GarmentUpdate) =>
    api.put<Garment>(`/wardrobe/${id}`, patch).then((r) => r.data),
  remove: (id: string) => api.delete(`/wardrobe/${id}`).then(() => undefined),
  logWear: (id: string) => api.post<Garment>(`/wardrobe/${id}/wear`).then((r) => r.data),
  confirm: (id: string) => api.post<Garment>(`/wardrobe/${id}/confirm`).then((r) => r.data),
  reclassify: (id: string) => api.post<Garment>(`/wardrobe/${id}/reclassify`).then((r) => r.data),
  cared: (id: string) => api.post<Garment>(`/wardrobe/${id}/cared`).then((r) => r.data),
  setCareReminders: (id: string, enabled: boolean) =>
    api.put<Garment>(`/wardrobe/${id}/care-reminders`, { enabled }).then((r) => r.data),
  roi: () => api.get<RoiReport>('/wardrobe/roi').then((r) => r.data),
  underutilised: () => api.get<Underutilised[]>('/wardrobe/underutilized').then((r) => r.data),

  /** Upload up to 10 photos in one multipart request. */
  upload: (photos: LocalPhoto[], onProgress?: (fraction: number) => void) => {
    const form = new FormData();
    photos.forEach((p, i) => {
      // React Native's FormData accepts {uri, name, type} objects for files.
      form.append('files', {
        uri: p.uri,
        name: p.fileName ?? `photo_${i}.jpg`,
        type: p.mimeType ?? 'image/jpeg',
      } as unknown as Blob);
    });
    return api
      .post<UploadResult>('/wardrobe/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120_000,
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(e.loaded / e.total);
        },
      })
      .then((r) => r.data);
  },
};
