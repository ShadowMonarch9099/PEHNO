/**
 * Secure token persistence (Keychain / Keystore via expo-secure-store).
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Web has no Keychain; use localStorage so the app runs in a browser during development.
const store = {
  get: (k: string) => (Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.getItem(k) ?? null) : SecureStore.getItemAsync(k)),
  set: (k: string, v: string) => (Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.setItem(k, v)) : SecureStore.setItemAsync(k, v)),
  del: (k: string) => (Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.removeItem(k)) : SecureStore.deleteItemAsync(k)),
};

const ACCESS = 'pehno.access_token';
const REFRESH = 'pehno.refresh_token';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export const tokenStorage = {
  async get(): Promise<StoredTokens | null> {
    const [accessToken, refreshToken] = await Promise.all([
      store.get(ACCESS),
      store.get(REFRESH),
    ]);
    return accessToken && refreshToken ? { accessToken, refreshToken } : null;
  },
  async set(tokens: StoredTokens): Promise<void> {
    await Promise.all([
      store.set(ACCESS, tokens.accessToken),
      store.set(REFRESH, tokens.refreshToken),
    ]);
  },
  async clear(): Promise<void> {
    await Promise.all([store.del(ACCESS), store.del(REFRESH)]);
  },
};
