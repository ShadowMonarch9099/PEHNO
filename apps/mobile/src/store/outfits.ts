/**
 * Outfit state. Options are cached by id so feedback/save/wear update every
 * screen showing the same outfit.
 */
import { create } from 'zustand';
import { outfitsApi } from '../services';
import { cache, isNetworkError } from '../services/cache';
import type { Outfit, OutfitOptions, WeatherInfo } from '../services/types';

interface OutfitState {
  byId: Record<string, Outfit>;
  daily: { outfit: Outfit | null; weather: WeatherInfo | null; hint: string | null; loadedFor: string | null; offline: boolean };
  loadDaily: (regenerate?: boolean) => Promise<void>;
  generate: (occasion: string, festival?: string) => Promise<OutfitOptions>;
  feedback: (id: string, value: 1 | -1) => Promise<void>;
  rate: (id: string, rating: 1 | 2 | 3 | 4 | 5) => Promise<void>;
  toggleSave: (id: string) => Promise<void>;
  wear: (id: string) => Promise<void>;
  upsert: (o: Outfit) => void;
}

export const useOutfitStore = create<OutfitState>((set, get) => ({
  byId: {},
  daily: { outfit: null, weather: null, hint: null, loadedFor: null, offline: false },

  upsert: (o) => set((s) => ({ byId: { ...s.byId, [o.id]: o } })),

  loadDaily: async (regenerate = false) => {
    const today = new Date().toDateString();
    // offline cache: today's look (or the last one we saved) renders before the network answers
    if (!regenerate && !get().daily.outfit) {
      const hit = await cache.get<{ outfit: Outfit | null; weather: WeatherInfo | null; hint: string | null; day: string }>('daily');
      if (hit?.data.outfit) {
        get().upsert(hit.data.outfit);
        set({ daily: { ...hit.data, loadedFor: hit.data.day === today ? today : null, offline: true } });
      }
    }
    try {
      const res = await outfitsApi.daily(regenerate);
      const outfit = res.options[0] ?? null;
      if (outfit) get().upsert(outfit);
      set({ daily: { outfit, weather: res.weather, hint: res.hint, loadedFor: today, offline: false } });
      void cache.set('daily', { outfit, weather: res.weather, hint: res.hint, day: today });
      void rememberDaily({ outfit, weather: res.weather, hint: res.hint, day: today });
    } catch (e) {
      if (isNetworkError(e) && get().daily.outfit) {
        set((s) => ({ daily: { ...s.daily, loadedFor: today, offline: true } }));
        return;
      }
      throw e;
    }
  },

  generate: async (occasion, festival) => {
    const res = await outfitsApi.generate(occasion, festival);
    res.options.forEach(get().upsert);
    return res;
  },

  feedback: async (id, value) => {
    get().upsert(await outfitsApi.feedback(id, value));
  },

  rate: async (id, rating) => {
    get().upsert(await outfitsApi.rate(id, rating));
  },

  toggleSave: async (id) => {
    const cur = get().byId[id];
    get().upsert(cur?.is_saved ? await outfitsApi.unsave(id) : await outfitsApi.save(id));
  },

  wear: async (id) => {
    get().upsert(await outfitsApi.wear(id));
  },
}));

// ── last 7 daily looks (offline history) ────────────────────────────────────
type DailyEntry = { outfit: Outfit | null; weather: WeatherInfo | null; hint: string | null; day: string };

async function rememberDaily(entry: DailyEntry): Promise<void> {
  if (!entry.outfit) return;
  const hit = await cache.get<DailyEntry[]>('daily.recent');
  const rest = (hit?.data ?? []).filter((e) => e.day !== entry.day);
  await cache.set('daily.recent', [entry, ...rest].slice(0, 7));
}

/** The last 7 days' looks from the offline cache, newest first. */
export const recentDailyLooks = async (): Promise<DailyEntry[]> => (await cache.get<DailyEntry[]>('daily.recent'))?.data ?? [];
