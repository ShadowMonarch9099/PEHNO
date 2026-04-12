/**
 * PEHNO Zustand Stores
 */
import { create } from 'zustand';

// ── Types (inline for mobile bundle) ──────────────────────────────────────────

export interface User {
  id: string;
  phone: string;
  email?: string | null;
  name: string;
  city: string;
  gender: 'female' | 'male' | 'other';
  body_type: 'petite' | 'regular' | 'tall' | 'plus';
  skin_tone: 'fair' | 'wheatish' | 'medium' | 'dark';
  regional_style: string;
  subscription_tier: 'free' | 'plus' | 'pro';
  onboarding_complete: boolean;
}

export interface Garment {
  id: string;
  user_id: string;
  image_url: string;
  thumbnail_url?: string;
  garment_type: string;
  fabric_type: string;
  color_primary: string;
  color_accent?: string;
  occasion_tags: string[];
  season_tags: string[];
  wear_count: number;
  ai_confidence: number;
  classification_status: 'pending' | 'complete' | 'failed';
  user_verified: boolean;
  care_profile: Record<string, string>;
  purchase_price?: number;
  condition: 'new' | 'good' | 'worn';
  notes?: string;
  created_at: string;
}

export interface Outfit {
  id: string;
  garment_ids: string[];
  garments?: Garment[];
  occasion: string;
  weather_condition: string;
  temperature_celsius: number;
  festival?: string;
  rating?: number;
  is_saved: boolean;
  created_at: string;
}

export interface Festival {
  id: string;
  name: string;
  slug: string;
  date_this_year: string;
  region: string[];
  color_codes: Record<string, string>;
  dress_code: string;
  occasion_tags: string[];
  description: string;
  days_until?: number;
}

export interface WardrobeFilters {
  occasion: string | null;
  fabric: string | null;
  season: string | null;
}

// ── User Store ─────────────────────────────────────────────────────────────────

interface UserStore {
  user: User | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  subscriptionTier: 'free' | 'plus' | 'pro';
  setUser: (user: User) => void;
  setTokens: (accessToken: string) => void;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  isAuthenticated: false,
  accessToken: null,
  subscriptionTier: 'free',

  setUser: (user) => set({
    user,
    isAuthenticated: true,
    subscriptionTier: user.subscription_tier,
  }),

  setTokens: (accessToken) => set({ accessToken }),

  logout: () => set({
    user: null,
    isAuthenticated: false,
    accessToken: null,
    subscriptionTier: 'free',
  }),

  updateProfile: (updates) => set((state) => ({
    user: state.user ? { ...state.user, ...updates } : null,
    subscriptionTier: updates.subscription_tier || state.subscriptionTier,
  })),
}));

// ── Wardrobe Store ─────────────────────────────────────────────────────────────

interface WardrobeStore {
  garments: Garment[];
  isLoading: boolean;
  filters: WardrobeFilters;
  loadGarments: (garments: Garment[]) => void;
  addGarment: (garment: Garment) => void;
  updateGarment: (id: string, updates: Partial<Garment>) => void;
  deleteGarment: (id: string) => void;
  setFilters: (filters: Partial<WardrobeFilters>) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
}

export const useWardrobeStore = create<WardrobeStore>((set) => ({
  garments: [],
  isLoading: false,
  filters: { occasion: null, fabric: null, season: null },

  loadGarments: (garments) => set({ garments }),

  addGarment: (garment) => set((state) => ({
    garments: [garment, ...state.garments],
  })),

  updateGarment: (id, updates) => set((state) => ({
    garments: state.garments.map((g) => g.id === id ? { ...g, ...updates } : g),
  })),

  deleteGarment: (id) => set((state) => ({
    garments: state.garments.filter((g) => g.id !== id),
  })),

  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters },
  })),

  clearFilters: () => set({ filters: { occasion: null, fabric: null, season: null } }),

  setLoading: (loading) => set({ isLoading: loading }),
}));

// ── Outfit Store ───────────────────────────────────────────────────────────────

interface OutfitStore {
  dailyOutfit: Outfit | null;
  savedOutfits: Outfit[];
  history: Outfit[];
  isLoading: boolean;
  setDailyOutfit: (outfit: Outfit) => void;
  loadSavedOutfits: (outfits: Outfit[]) => void;
  loadHistory: (outfits: Outfit[]) => void;
  saveOutfit: (outfit: Outfit) => void;
  unsaveOutfit: (id: string) => void;
  rateOutfit: (id: string, rating: number) => void;
  setLoading: (loading: boolean) => void;
}

export const useOutfitStore = create<OutfitStore>((set) => ({
  dailyOutfit: null,
  savedOutfits: [],
  history: [],
  isLoading: false,

  setDailyOutfit: (outfit) => set({ dailyOutfit: outfit }),

  loadSavedOutfits: (outfits) => set({ savedOutfits: outfits }),

  loadHistory: (outfits) => set({ history: outfits }),

  saveOutfit: (outfit) => set((state) => ({
    savedOutfits: [outfit, ...state.savedOutfits],
  })),

  unsaveOutfit: (id) => set((state) => ({
    savedOutfits: state.savedOutfits.filter((o) => o.id !== id),
  })),

  rateOutfit: (id, rating) => set((state) => ({
    history: state.history.map((o) => o.id === id ? { ...o, rating } : o),
  })),

  setLoading: (loading) => set({ isLoading: loading }),
}));

// ── Festival Store ─────────────────────────────────────────────────────────────

interface NavratriColor {
  day: number;
  color_name: string;
  color_hex: string;
  is_today: boolean;
}

interface FestivalStore {
  upcomingFestivals: Festival[];
  navratriDay: NavratriColor | null;
  isLoading: boolean;
  loadFestivals: (festivals: Festival[]) => void;
  setNavratriDay: (day: NavratriColor | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useFestivalStore = create<FestivalStore>((set) => ({
  upcomingFestivals: [],
  navratriDay: null,
  isLoading: false,

  loadFestivals: (festivals) => set({ upcomingFestivals: festivals }),

  setNavratriDay: (day) => set({ navratriDay: day }),

  setLoading: (loading) => set({ isLoading: loading }),
}));
