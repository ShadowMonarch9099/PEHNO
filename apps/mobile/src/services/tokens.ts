/**
 * Secure token persistence (Keychain / Keystore via expo-secure-store).
 */
import * as SecureStore from 'expo-secure-store';

const ACCESS = 'pehno.access_token';
const REFRESH = 'pehno.refresh_token';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export const tokenStorage = {
  async get(): Promise<StoredTokens | null> {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS),
      SecureStore.getItemAsync(REFRESH),
    ]);
    return accessToken && refreshToken ? { accessToken, refreshToken } : null;
  },
  async set(tokens: StoredTokens): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS, tokens.accessToken),
      SecureStore.setItemAsync(REFRESH, tokens.refreshToken),
    ]);
  },
  async clear(): Promise<void> {
    await Promise.all([SecureStore.deleteItemAsync(ACCESS), SecureStore.deleteItemAsync(REFRESH)]);
  },
};
