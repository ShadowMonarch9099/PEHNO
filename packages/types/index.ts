// ============================================================
// PEHNO — Shared TypeScript Types
// ============================================================

// ── Enums ──────────────────────────────────────────────────

export type Gender = 'female' | 'male' | 'other';
export type BodyType = 'petite' | 'regular' | 'tall' | 'plus';
export type SkinTone = 'fair' | 'wheatish' | 'medium' | 'dark';
export type SubscriptionTier = 'free' | 'plus' | 'pro';
export type GarmentCondition = 'new' | 'good' | 'worn';

export type Season = 'summer' | 'monsoon' | 'winter' | 'all';
export type Occasion =
  | 'casual'
  | 'office'
  | 'wedding_guest'
  | 'pooja'
  | 'festival'
  | 'formal'
  | 'night_out'
  | 'campus'
  | 'temple';

export type RegionalStyle =
  | 'rajasthani'
  | 'south_indian'
  | 'punjabi'
  | 'mumbai_minimal'
  | 'pan_india_fusion';

// ── User ───────────────────────────────────────────────────

export interface User {
  id: string;
  phone: string;
  email?: string | null;
  name: string;
  city: string;
  gender: Gender;
  body_type: BodyType;
  skin_tone: SkinTone;
  regional_style: RegionalStyle;
  subscription_tier: SubscriptionTier;
  subscription_expires_at?: string | null;
  created_at: string;
}

export interface UserStats {
  wardrobe_count: number;
  outfit_count: number;
  avg_cost_per_wear: number;
}

// ── Garment ────────────────────────────────────────────────

export interface CareProfile {
  wash: string;
  iron: string;
  storage: string;
  dry_clean?: boolean;
  notes?: string;
}

export interface Garment {
  id: string;
  user_id: string;
  image_url: string;
  garment_type: string;
  fabric_type: string;
  color_primary: string;
  color_accent?: string | null;
  occasion_tags: string[];
  season_tags: string[];
  regional_style?: string | null;
  purchase_price?: number | null;
  purchase_date?: string | null;
  condition: GarmentCondition;
  wear_count: number;
  last_worn_at?: string | null;
  ai_confidence: number;
  user_verified: boolean;
  care_profile: CareProfile;
  notes?: string | null;
  created_at: string;
}

export interface GarmentUploadResponse {
  garment_id: string;
  status: 'classifying';
  message: string;
}

export interface GarmentClassificationResult {
  garment_type: string;
  fabric_type: string;
  color_primary: string;
  color_accent?: string;
  occasion_tags: string[];
  season_tags: string[];
  regional_style?: string;
  confidence_score: number;
  care_profile: CareProfile;
}

// ── Outfit ─────────────────────────────────────────────────

export interface Outfit {
  id: string;
  user_id: string;
  garment_ids: string[];
  garments?: Garment[];
  occasion: string;
  weather_condition: string;
  temperature_celsius: number;
  festival?: string | null;
  worn_at?: string | null;
  rating?: number | null;
  is_saved: boolean;
  created_at: string;
}

export interface OutfitGenerateRequest {
  occasion: Occasion;
  festival?: string;
}

export interface DailyOutfitResponse {
  outfit: Outfit;
  weather: WeatherData;
  reason: string;
}

// ── Weather ────────────────────────────────────────────────

export interface WeatherData {
  city: string;
  temperature_celsius: number;
  feels_like: number;
  humidity: number;
  condition: string;
  condition_code: number;
  icon: string;
}

// ── Festival ───────────────────────────────────────────────

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
}

export interface UpcomingFestival extends Festival {
  days_until: number;
}

export interface NavratriDay {
  day: number;
  color_name: string;
  color_hex: string;
  is_today: boolean;
  matching_garments?: Garment[];
}

export interface FestivalDetail extends Festival {
  curated_looks: Outfit[];
  navratri_days?: NavratriDay[];
}

// ── Auth ───────────────────────────────────────────────────

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
}

export interface SendOtpRequest {
  phone: string;
}

export interface VerifyOtpRequest {
  phone: string;
  otp: string;
}

// ── API Responses ──────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface ApiError {
  detail: string;
  status_code: number;
}

// ── Wardrobe Filters ───────────────────────────────────────

export interface WardrobeFilters {
  occasion?: string | null;
  fabric?: string | null;
  season?: string | null;
  garment_type?: string | null;
}

// ── Notification ───────────────────────────────────────────

export interface NotificationPrefs {
  daily_outfit_push: boolean;
  festival_alerts: boolean;
  care_reminders: boolean;
}

// ── Indian Cities ──────────────────────────────────────────

export const INDIAN_CITIES = [
  'Mumbai',
  'Delhi',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Pune',
  'Ahmedabad',
  'Jaipur',
  'Lucknow',
  'Chandigarh',
  'Kochi',
  'Bhopal',
  'Indore',
  'Nagpur',
  'Patna',
  'Bhubaneswar',
  'Surat',
  'Coimbatore',
  'Visakhapatnam',
] as const;

export type IndianCity = (typeof INDIAN_CITIES)[number];
