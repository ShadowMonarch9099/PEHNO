/**
 * Vocabularies from /meta. Loaded once per app session; safe fallbacks keep the
 * pickers usable offline.
 */
import { create } from 'zustand';
import { useI18nStore } from '../i18n';
import { metaApi } from '../services';
import { cache } from '../services/cache';
import type { City, WardrobeOptions } from '../services/types';

const FALLBACK_OPTIONS: WardrobeOptions = {
  garment_types: [],
  fabrics: [],
  occasions: [],
  seasons: [
    { slug: 'summer', label: 'Summer' },
    { slug: 'monsoon', label: 'Monsoon' },
    { slug: 'winter', label: 'Winter' },
    { slug: 'all_season', label: 'All season' },
  ],
  colors: [],
  regional_styles: [
    { slug: 'rajasthani', label: 'Rajasthani' },
    { slug: 'south_indian', label: 'South Indian' },
    { slug: 'punjabi', label: 'Punjabi' },
    { slug: 'mumbai_minimal', label: 'Mumbai Minimal' },
    { slug: 'pan_india_fusion', label: 'Pan-India Fusion' },
  ],
  conditions: [
    { slug: 'new', label: 'New' },
    { slug: 'good', label: 'Good' },
    { slug: 'worn', label: 'Worn' },
  ],
};

interface MetaState {
  options: WardrobeOptions;
  cities: City[];
  loaded: boolean;
  loadedLang: string | null;
  load: (force?: boolean) => Promise<void>;
}

export const useMetaStore = create<MetaState>((set, get) => ({
  options: FALLBACK_OPTIONS,
  cities: [],
  loaded: false,
  loadedLang: null,
  /** Loads vocab for the current UI language: cache first (instant, offline), then network. */
  load: async (force = false) => {
    const lang = useI18nStore.getState().language;
    if (get().loaded && get().loadedLang === lang && !force) return;
    const key = `meta.${lang}`;
    const hit = await cache.get<{ options: WardrobeOptions; cities: City[] }>(key);
    if (hit) set({ options: hit.data.options, cities: hit.data.cities, loaded: true, loadedLang: lang });
    try {
      const [options, cities] = await Promise.all([metaApi.wardrobeOptions(lang), metaApi.cities()]);
      set({ options, cities, loaded: true, loadedLang: lang });
      void cache.set(key, { options, cities });
    } catch {
      // keep cache/fallbacks; retry next call
    }
  },
}));

// re-fetch vocab whenever the language changes
useI18nStore.subscribe((s, prev) => {
  if (s.language !== prev.language) void useMetaStore.getState().load(true);
});

export const labelFor = (opts: { slug: string; label: string }[], slug: string | null | undefined) =>
  opts.find((o) => o.slug === slug)?.label ?? (slug ? slug.replace(/_/g, ' ') : '—');

/** Garment-type chips for a user: their gender's pieces + unisex; 'other' sees everything. */
export const garmentTypesFor = (opts: { slug: string; label: string; gender?: string }[], gender: string | undefined) => {
  const allowed = gender === 'female' ? ['women', 'unisex'] : gender === 'male' ? ['men', 'unisex'] : null;
  return allowed ? opts.filter((o) => !o.gender || allowed.includes(o.gender)) : opts;
};
