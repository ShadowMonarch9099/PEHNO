/**
 * Festival state (spec: useFestivalStore) — upcoming festivals + today's Navratri
 * colour, cached so the Festivals tab and DailyLook share one fetch and work offline.
 */
import { create } from 'zustand';
import { festivalsApi } from '../services';
import { cache } from '../services/cache';
import type { Festival, NavratriToday } from '../services/types';

interface FestivalState {
  upcoming: Festival[];
  navratri: NavratriToday | null;
  loadedAt: number | null;
  loading: boolean;
  error: string | null;
  loadFestivals: (force?: boolean) => Promise<void>;
  /** Today's Navratri colour name, or null outside the nine nights. */
  getNavratriColor: () => string | null;
  navratriDay: () => number | null;
}

const STALE_MS = 6 * 60 * 60 * 1000; // spec: cache /festivals/upcoming for 6 hours

export const useFestivalStore = create<FestivalState>((set, get) => ({
  upcoming: [],
  navratri: null,
  loadedAt: null,
  loading: false,
  error: null,

  loadFestivals: async (force = false) => {
    const { loadedAt } = get();
    if (!force && loadedAt && Date.now() - loadedAt < STALE_MS) return;
    set({ loading: true, error: null });
    if (!get().upcoming.length) {
      const hit = await cache.get<{ upcoming: Festival[]; navratri: NavratriToday | null }>('festivals');
      if (hit) set({ upcoming: hit.data.upcoming, navratri: hit.data.navratri });
    }
    try {
      const [upcoming, navratri] = await Promise.all([festivalsApi.upcoming(6), festivalsApi.navratriToday()]);
      set({ upcoming, navratri, loadedAt: Date.now(), loading: false });
      void cache.set('festivals', { upcoming, navratri });
    } catch (e) {
      set({ loading: false, error: get().upcoming.length ? null : e instanceof Error ? e.message : 'Could not load festivals' });
    }
  },

  getNavratriColor: () => {
    const n = get().navratri;
    return n?.is_active && n.today ? n.today.name : null;
  },

  navratriDay: () => {
    const n = get().navratri;
    return n?.is_active ? n.day : null;
  },
}));
