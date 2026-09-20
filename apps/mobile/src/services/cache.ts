/**
 * Small JSON cache on AsyncStorage for stale-while-revalidate: screens render
 * the last good payload instantly (and offline), then refresh from the API.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'pehno.cache.';

export interface Cached<T> {
  data: T;
  savedAt: number; // epoch ms
}

export const cache = {
  async get<T>(key: string): Promise<Cached<T> | null> {
    try {
      const raw = await AsyncStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as Cached<T>) : null;
    } catch {
      return null;
    }
  },
  async set<T>(key: string, data: T): Promise<void> {
    try {
      await AsyncStorage.setItem(PREFIX + key, JSON.stringify({ data, savedAt: Date.now() } satisfies Cached<T>));
    } catch {
      /* best effort */
    }
  },
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
  },
  /** Wipe everything (sign-out). */
  async clear(): Promise<void> {
    try {
      const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
      if (keys.length) await AsyncStorage.multiRemove(keys);
    } catch {
      /* ignore */
    }
  },
};

/** True for the network-failure shape axios produces when the device is offline. */
export const isNetworkError = (e: unknown): boolean => {
  if (typeof e !== 'object' || e === null) return false;
  const { code, message } = e as { code?: string; message?: string };
  return code === 'ERR_NETWORK' || message === 'Network Error';
};
