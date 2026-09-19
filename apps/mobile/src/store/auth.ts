/**
 * Auth/session state. Tokens live in SecureStore; the user object lives here.
 *
 * status:
 *   'booting'  – restoring a session on app start
 *   'signedOut'
 *   'signedIn'
 */
import { create } from 'zustand';
import { authApi, setSessionExpiredHandler, tokenStorage, usersApi } from '../services';
import type { TokenResponse, User } from '../services/types';

type Status = 'booting' | 'signedOut' | 'signedIn';

interface AuthState {
  status: Status;
  user: User | null;
  /** Restore tokens + profile from disk. Call once at app start. */
  bootstrap: () => Promise<void>;
  /** Persist a fresh login/refresh payload. */
  signIn: (tokens: TokenResponse) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'booting',
  user: null,

  bootstrap: async () => {
    setSessionExpiredHandler(() => set({ status: 'signedOut', user: null }));
    const tokens = await tokenStorage.get();
    if (!tokens) {
      set({ status: 'signedOut' });
      return;
    }
    try {
      const user = await usersApi.me(); // triggers refresh automatically on 401
      set({ status: 'signedIn', user });
    } catch {
      await tokenStorage.clear();
      set({ status: 'signedOut', user: null });
    }
  },

  signIn: async (tokens) => {
    await tokenStorage.set({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
    set({ status: 'signedIn', user: tokens.user });
  },

  signOut: async () => {
    const tokens = await tokenStorage.get();
    if (tokens) authApi.logout(tokens.refreshToken).catch(() => undefined); // best effort
    await tokenStorage.clear();
    set({ status: 'signedOut', user: null });
  },

  setUser: (user) => set({ user }),

  refreshUser: async () => {
    if (get().status !== 'signedIn') return;
    set({ user: await usersApi.me() });
  },
}));
