/**
 * Wardrobe state: the user's garments + active filters. Server is the source of
 * truth; this store is a cache that's refreshed on focus and patched on mutations.
 */
import { create } from 'zustand';
import { wardrobeApi } from '../services';
import type { LocalPhoto } from '../services/wardrobe';
import type { Garment, GarmentFilters, UploadResult } from '../services/types';

export const WARDROBE_GOAL = 30;

interface WardrobeState {
  garments: Garment[];
  total: number;
  filters: GarmentFilters;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setFilters: (patch: GarmentFilters) => void;
  clearFilters: () => void;
  upload: (photos: LocalPhoto[], onProgress?: (f: number) => void) => Promise<UploadResult>;
  update: (id: string, patch: Parameters<typeof wardrobeApi.update>[1]) => Promise<Garment>;
  remove: (id: string) => Promise<void>;
  logWear: (id: string) => Promise<Garment>;
  confirm: (id: string) => Promise<Garment>;
  reclassify: (id: string) => Promise<Garment>;
  upsert: (g: Garment) => void;
  /** Re-fetch garments still classifying. Returns true if any remain pending. */
  pollPending: () => Promise<boolean>;
}

export const useWardrobeStore = create<WardrobeState>((set, get) => ({
  garments: [],
  total: 0,
  filters: {},
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const res = await wardrobeApi.list({ ...get().filters, page_size: 200 });
      set({ garments: res.items, total: res.total, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Failed to load wardrobe' });
    }
  },

  setFilters: (patch) => {
    set({ filters: { ...get().filters, ...patch } });
    void get().refresh();
  },

  clearFilters: () => {
    set({ filters: {} });
    void get().refresh();
  },

  upload: async (photos, onProgress) => {
    const res = await wardrobeApi.upload(photos, onProgress);
    set((s) => ({ garments: [...res.created, ...s.garments], total: s.total + res.created.length }));
    return res;
  },

  update: async (id, patch) => {
    const g = await wardrobeApi.update(id, patch);
    get().upsert(g);
    return g;
  },

  remove: async (id) => {
    await wardrobeApi.remove(id);
    set((s) => ({ garments: s.garments.filter((g) => g.id !== id), total: Math.max(0, s.total - 1) }));
  },

  logWear: async (id) => {
    const g = await wardrobeApi.logWear(id);
    get().upsert(g);
    return g;
  },

  confirm: async (id) => {
    const g = await wardrobeApi.confirm(id);
    get().upsert(g);
    return g;
  },

  reclassify: async (id) => {
    const g = await wardrobeApi.reclassify(id);
    get().upsert(g);
    return g;
  },

  pollPending: async () => {
    const pending = get().garments.filter((g) => g.classification_status === 'pending');
    if (!pending.length) return false;
    const fresh = await Promise.all(pending.map((g) => wardrobeApi.get(g.id).catch(() => null)));
    fresh.forEach((g) => g && get().upsert(g));
    return get().garments.some((g) => g.classification_status === 'pending');
  },

  upsert: (g) =>
    set((s) => ({
      garments: s.garments.some((x) => x.id === g.id)
        ? s.garments.map((x) => (x.id === g.id ? g : x))
        : [g, ...s.garments],
    })),
}));
