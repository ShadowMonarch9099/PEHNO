/**
 * i18n: a persisted language preference and a `t()` that reads it. Components
 * call `useT()` so they re-render on language change.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { STRINGS, type Language, type StringKey } from './strings';

const KEY = 'pehno.language';

interface I18nState {
  language: Language;
  ready: boolean;
  load: () => Promise<void>;
  setLanguage: (language: Language) => Promise<void>;
}

export const useI18nStore = create<I18nState>((set) => ({
  language: 'en',
  ready: false,
  load: async () => {
    try {
      const stored = await AsyncStorage.getItem(KEY);
      if (stored === 'hi' || stored === 'en') set({ language: stored });
    } catch {
      /* default en */
    } finally {
      set({ ready: true });
    }
  },
  setLanguage: async (language) => {
    set({ language });
    try {
      await AsyncStorage.setItem(KEY, language);
    } catch {
      /* ignore */
    }
  },
}));

const interpolate = (s: string, vars?: Record<string, string | number>) =>
  vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : s;

/** Translate outside React (stores, helpers). */
export const t = (key: StringKey, vars?: Record<string, string | number>): string => {
  const lang = useI18nStore.getState().language;
  return interpolate(STRINGS[lang][key] ?? STRINGS.en[key] ?? key, vars);
};

/** Translate inside components; re-renders when the language changes. */
export const useT = () => {
  const language = useI18nStore((s) => s.language);
  return (key: StringKey, vars?: Record<string, string | number>) => interpolate(STRINGS[language][key] ?? STRINGS.en[key] ?? key, vars);
};

export type { Language, StringKey };
