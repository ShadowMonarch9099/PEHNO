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
  entitlements?: Entitlements | null;
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

export interface CareProfile {
  wash?: string;
  iron?: string;
  storage?: string;
  dry_clean?: boolean;
  notes?: string;
  monsoon?: string;
}

export interface Candidate {
  label: string;
  confidence: number;
}

/** Snapshot of the model's prediction, kept even after the user edits the item. */
export interface AiLabels {
  garment_type: string;
  fabric_type: string;
  color_primary: string;
  color_accent: string | null;
  occasion_tags: string[];
  season_tags: string[];
  regional_style: string | null;
  confidence: number;
  backend: string;
  candidates: { garment_types: Candidate[]; fabrics: Candidate[] };
}

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
  care_profile: CareProfile;
  ai_labels: AiLabels | null;
  classified_at: string | null;
  purchase_price: number | null;
  purchase_date: string | null;
  condition: GarmentCondition;
  notes: string | null;
  wear_count: number;
  last_worn_at: string | null;
  cost_per_wear: number | null;
  wears_since_care: number;
  last_cared_at: string | null;
  care_reminders_enabled: boolean;
  care_due: boolean;
  care_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface RoiRow {
  garment: Garment;
  cost_per_wear: number | null;
  verdict: 'great' | 'ok' | 'poor' | 'unworn' | 'unpriced';
}

export interface RoiReport {
  rows: RoiRow[];
  summary: { garments: number; priced: number; worn: number; avg_cost_per_wear: number | null; best: number | null; worst: number | null };
}

export interface Underutilised {
  garment: Garment;
  days_idle: number | null;
  pairings: { garment: Garment; occasion: string }[];
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

// ── Outfits ────────────────────────────────────────────────────────────────

export interface WeatherInfo {
  city: string;
  temp_c: number;
  feels_like_c: number;
  humidity: number;
  condition: 'sunny' | 'cloudy' | 'humid' | 'rain' | 'foggy' | 'cold';
  season: 'summer' | 'monsoon' | 'winter' | 'transition';
  source: 'openweather' | 'climatology';
  description: string;
  fabric_tip: string;
}

export interface Outfit {
  id: string;
  occasion: string;
  festival: string | null;
  garments: Garment[];
  weather_condition: string;
  temperature_celsius: number;
  season: string;
  score: number;
  rationale: string[];
  feedback: 1 | -1 | null;
  is_saved: boolean;
  is_daily: boolean;
  for_date: string | null;
  batch_id: string | null;
  worn_at: string | null;
  created_at: string;
}

export interface OutfitOptions {
  weather: WeatherInfo;
  options: Outfit[];
  batch_id: string | null;
  hint: string | null;
}

export interface OutfitList {
  items: Outfit[];
  total: number;
  page: number;
  page_size: number;
}

// ── Festivals ──────────────────────────────────────────────────────────────

export interface Festival {
  slug: string;
  name: string;
  start_date: string;
  end_date: string;
  days_until: number;
  is_active: boolean;
  is_relevant: boolean;
  regions: string[];
  colors: string[];
  color_guidance: string;
  dress_code: string;
  description: string;
  occasion_tags: string[];
  lunar_calendar: boolean;
}

export interface FestivalDetail extends Festival {
  looks: Outfit[];
  hint: string | null;
  locked: Paywall | null;
}

export interface NavratriColor {
  day: number;
  date: string;
  key: string;
  name: string;
  hex: string;
  color_slugs: string[];
  goddess: string | null;
}

export interface NavratriToday {
  locked: Paywall | null;
  is_active: boolean;
  starts_on: string | null;
  days_until: number | null;
  day: number | null;
  today: NavratriColor | null;
  sequence: NavratriColor[];
  matching_garments: Garment[];
}

// ── Billing / entitlements ─────────────────────────────────────────────────

export interface FeatureEntitlement {
  label: string;
  unlocked: boolean;
  required_tier: SubscriptionTier;
}

export interface Entitlements {
  tier: SubscriptionTier;
  expires_at: string | null;
  garment_limit: number | null;
  garments_used: number;
  features: Record<string, FeatureEntitlement>;
  nudge: 'plus_wardrobe_20' | null;
}

/** Body of a 402 response: the client renders this as a locked feature + upgrade prompt. */
export interface Paywall {
  message: string;
  feature: string;
  required_tier: SubscriptionTier;
  upgrade_path: string;
}

export interface Plan {
  tier: SubscriptionTier;
  name: string;
  price_inr_month: number;
  tagline: string;
  features: string[];
  garment_limit: number | null;
}

export interface Subscription {
  id: string;
  plan: 'plus' | 'pro';
  status: 'created' | 'active' | 'cancelled' | 'halted' | 'expired';
  provider: 'razorpay' | 'mock';
  checkout_url: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
}

export interface BillingState {
  entitlements: Entitlements;
  subscription: Subscription | null;
}

// ── Commerce ───────────────────────────────────────────────────────────────

export interface Gap {
  rank: number;
  garment_type: string;
  label: string;
  occasions: string[];
  new_outfits: number;
  score: number;
  suggested_colors: string[];
  suggested_fabrics: string[];
  typical_price_inr: [number, number];
  rationale: string;
}

export interface GapReport {
  computed_at: string;
  cached: boolean;
  wardrobe_size: number;
  current_outfits: number;
  budget_inr: number | null;
  gaps: Gap[];
  most_versatile: [string, number][];
  hint: string | null;
}

export interface ProductCard {
  platform: 'myntra' | 'ajio' | 'nykaa' | 'meesho';
  platform_label: string;
  name: string;
  query: string;
  product_url: string;
  price_min_inr: number | null;
  price_max_inr: number | null;
  image_url: string | null;
  is_search: boolean;
}

export interface AffiliateLinks {
  gap_type: string;
  color: string | null;
  fabric: string | null;
  budget_inr: number | null;
  cards: ProductCard[];
  untracked: boolean;
}

export interface ScanResult {
  garment_type: string;
  fabric_type: string;
  color_primary: string;
  color_accent: string | null;
  confidence: number;
  occasion_tags: string[];
  season_tags: string[];
  compatibility: number;
  pairs_with: Garment[];
  new_outfits: number;
  wardrobe_size: number;
  duplicate: Garment | null;
  duplicate_reason: string | null;
  weather_note: string;
  verdict: 'buy' | 'maybe' | 'skip';
  rationale: string[];
}
