/**
 * Draft answers collected across the onboarding screens, submitted once at the end.
 */
import { create } from 'zustand';
import { usersApi } from '../services';
import type { BodyType, Gender, RegionalStyle, SkinTone, User } from '../services/types';
import { useAuthStore } from './auth';

interface OnboardingDraft {
  name: string;
  city: string;
  gender: Gender;
  body_type: BodyType;
  skin_tone: SkinTone;
  regional_style: RegionalStyle;
}

interface OnboardingState {
  draft: OnboardingDraft;
  set: (patch: Partial<OnboardingDraft>) => void;
  /** Persist the draft and flip onboarding_complete. Returns the updated user. */
  complete: () => Promise<User>;
  /** Save what we have so far (so a killed app doesn't lose answers). */
  saveProgress: () => Promise<void>;
}

const initial: OnboardingDraft = {
  name: '',
  city: 'Mumbai',
  gender: 'female',
  body_type: 'regular',
  skin_tone: 'medium',
  regional_style: 'pan_india_fusion',
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  draft: initial,
  set: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  saveProgress: async () => {
    const user = await usersApi.update(get().draft);
    useAuthStore.getState().setUser(user);
  },
  complete: async () => {
    const user = await usersApi.update({ ...get().draft, onboarding_complete: true });
    useAuthStore.getState().setUser(user);
    set({ draft: initial });
    return user;
  },
}));
