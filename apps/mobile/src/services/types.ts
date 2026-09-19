/**
 * API response/request shapes. Mirrors apps/api/app/schemas.
 */
export type Gender = 'female' | 'male' | 'other';
export type BodyType = 'petite' | 'regular' | 'tall' | 'plus';
export type SkinTone = 'fair' | 'wheatish' | 'medium' | 'dark';
export type SubscriptionTier = 'free' | 'plus' | 'pro';
export type RegionalStyle =
  | 'rajasthani'
  | 'south_indian'
  | 'punjabi'
  | 'mumbai_minimal'
  | 'pan_india_fusion';

export interface User {
  id: string;
  phone: string;
  email: string | null;
  name: string;
  city: string;
  gender: Gender;
  body_type: BodyType;
  skin_tone: SkinTone;
  regional_style: RegionalStyle;
  subscription_tier: SubscriptionTier;
  subscription_expires_at: string | null;
  onboarding_complete: boolean;
  created_at: string;
}

export type UserUpdate = Partial<
  Pick<
    User,
    | 'name'
    | 'email'
    | 'city'
    | 'gender'
    | 'body_type'
    | 'skin_tone'
    | 'regional_style'
    | 'onboarding_complete'
  > & { fcm_token: string }
>;

export interface UserStats {
  garment_count: number;
  outfit_count: number;
  total_wears: number;
  avg_cost_per_wear: number | null;
}

export interface SendOtpResponse {
  message: string;
  phone: string;
  expires_in_seconds: number;
  dev_otp: string | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
  is_new_user: boolean;
  user: User;
}

/** Shape of every error body the API returns. */
export interface ApiErrorBody {
  detail: string;
  errors?: Record<string, string>;
}

// ── Wardrobe ───────────────────────────────────────────────────────────────

export type ClassificationStatus = 'pending' | 'complete' | 'failed';
export type GarmentCondition = 'new' | 'good' | 'worn';
export type Season = 'summer' | 'monsoon' | 'winter' | 'all_season';

export interface Garment {
  id: string;
  image_url: string;
  thumbnail_url: string | null;
  garment_type: string;
  fabric_type: string;
  color_primary: string;
  color_accent: string | null;
  occasion_tags: string[];
  season_tags: Season[];
  regional_style: RegionalStyle | null;
  ai_confidence: number;
  classification_status: ClassificationStatus;
  user_verified: boolean;
  care_profile: Record<string, unknown>;
  purchase_price: number | null;
  purchase_date: string | null;
  condition: GarmentCondition;
  notes: string | null;
  wear_count: number;
  last_worn_at: string | null;
  cost_per_wear: number | null;
  created_at: string;
  updated_at: string;
}

export interface GarmentList {
  items: Garment[];
  total: number;
  page: number;
  page_size: number;
}

export interface GarmentFilters {
  occasion?: string;
  fabric?: string;
  season?: Season;
  garment_type?: string;
  status?: ClassificationStatus;
  page?: number;
  page_size?: number;
}

export type GarmentUpdate = Partial<
  Pick<
    Garment,
    | 'garment_type'
    | 'fabric_type'
    | 'color_primary'
    | 'color_accent'
    | 'occasion_tags'
    | 'season_tags'
    | 'regional_style'
    | 'purchase_price'
    | 'purchase_date'
    | 'condition'
    | 'notes'
  >
>;

export interface UploadResult {
  created: Garment[];
  rejected: { filename: string; reason: string }[];
}

// ── Meta ───────────────────────────────────────────────────────────────────

export interface Option {
  slug: string;
  label: string;
}

export interface WardrobeOptions {
  garment_types: Option[];
  fabrics: Option[];
  occasions: Option[];
  seasons: Option[];
  colors: Option[];
  regional_styles: Option[];
  conditions: Option[];
}

export interface City {
  slug: string;
  name: string;
  state: string;
  region: string;
}
