/**
 * Outfit state. Options are cached by id so feedback/save/wear update every
 * screen showing the same outfit.
 */
import { create } from 'zustand';
import { outfitsApi } from '../services';
import type { Outfit, OutfitOptions, WeatherInfo } from '../services/types';

interface OutfitState {
  byId: Record<string, Outfit>;
  daily: { outfit: Outfit | null; weather: WeatherInfo | null; hint: string | null; loadedFor: string | null };
  loadDaily: (regenerate?: boolean) => Promise<void>;
  generate: (occasion: string, festival?: string) => Promise<OutfitOptions>;
  feedback: (id: string, value: 1 | -1) => Promise<void>;
  toggleSave: (id: string) => Promise<void>;
  wear: (id: string) => Promise<void>;
  upsert: (o: Outfit) => void;
}

export const useOutfitStore = create<OutfitState>((set, get) => ({
  byId: {},
  daily: { outfit: null, weather: null, hint: null, loadedFor: null },

  upsert: (o) => set((s) => ({ byId: { ...s.byId, [o.id]: o } })),

  loadDaily: async (regenerate = false) => {
    const res = await outfitsApi.daily(regenerate);
    const outfit = res.options[0] ?? null;
    if (outfit) get().upsert(outfit);
    set({ daily: { outfit, weather: res.weather, hint: res.hint, loadedFor: new Date().toDateString() } });
  },

  generate: async (occasion, festival) => {
    const res = await outfitsApi.generate(occasion, festival);
    res.options.forEach(get().upsert);
    return res;
  },

  feedback: async (id, value) => {
    get().upsert(await outfitsApi.feedback(id, value));
  },

  toggleSave: async (id) => {
    const cur = get().byId[id];
    get().upsert(cur?.is_saved ? await outfitsApi.unsave(id) : await outfitsApi.save(id));
  },

  wear: async (id) => {
    get().upsert(await outfitsApi.wear(id));
  },
}));
