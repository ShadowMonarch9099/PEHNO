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
