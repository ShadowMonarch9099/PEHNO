/**
 * Server-side client for the PEHNO admin API. Runs only in Route Handlers and
 * Server Components, so ADMIN_API_KEY never reaches the browser.
 */
import 'server-only';

const API_URL = process.env.API_URL ?? 'http://localhost:8000';

export class AdminApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function adminGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(path, API_URL);
  Object.entries(params ?? {}).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, String(v)));
  const res = await fetch(url, {
    headers: { 'X-Admin-Key': process.env.ADMIN_API_KEY ?? '' },
    cache: 'no-store',
  });
  if (!res.ok) throw new AdminApiError(res.status, `${path} → ${res.status}`);
  return (await res.json()) as T;
}

export async function adminPost<T>(path: string, body: unknown, method: 'POST' | 'PATCH' = 'POST'): Promise<T> {
  const res = await fetch(new URL(path, API_URL), {
    method,
    headers: { 'X-Admin-Key': process.env.ADMIN_API_KEY ?? '', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new AdminApiError(res.status, `${path} → ${res.status}`);
  return (await res.json()) as T;
}

// ── shapes (mirror apps/api/app/routers/admin.py) ────────────────────────────

export interface Metrics {
  users: { total: number; dau: number; by_tier: Record<string, number> };
  revenue: { mrr_inr: number; active_subscriptions: number; affiliate_30d_inr: number };
  activity: { outfits_24h: number; garments: number; garments_verified: number; classification_acceptance: number | null };
  affiliate_30d: { platform: string; clicks: number; conversions: number; commission_inr: number }[];
}

export interface AdminUser {
  id: string;
  name: string;
  phone: string;
  city: string;
  tier: string;
  garment_count: number;
  joined_at: string;
  last_active_at: string | null;
  onboarding_complete: boolean;
}

export interface UsersPage {
  total: number;
  page: number;
  page_size: number;
  items: AdminUser[];
}

export interface Analytics {
  days: number;
  user_growth: { date: string; signups: number; users: number }[];
  outfits_by_day: { date: string; outfits: number }[];
  affiliate_ctr: { platform: string; clicks: number; conversions: number; conversion_rate: number }[];
  funnel: { stage: string; users: number }[];
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  status: string;
  website: string | null;
  contact_email: string | null;
  tagline: string | null;
  logo_url: string | null;
  notes: string | null;
  campaign_count: number;
  created_at: string;
}

export interface CampaignConfig {
  description: string;
  hero_image_url: string | null;
  cta_url: string | null;
  cta_label: string;
  hashtag: string | null;
  reward_text: string | null;
  target: { cities: string[]; tiers: string[]; regional_styles: string[]; genders: string[] };
  products: { name: string; url: string; price_inr: number | null; image_url: string | null; garment_type: string | null; color: string | null }[];
  challenge: { goal: number; occasion: string | null; garment_types: string[]; fabrics: string[]; brand_match: boolean };
}

export interface Campaign {
  id: string;
  brand_id: string;
  title: string;
  kind: 'challenge' | 'collection';
  status: 'draft' | 'live' | 'ended';
  live: boolean;
  starts_at: string | null;
  ends_at: string | null;
  config: CampaignConfig;
  participants: number;
  created_at: string;
}

export interface BrandDetail extends Brand {
  campaigns: Campaign[];
}

export interface CampaignPerformance {
  days: number;
  views: number;
  unique_viewers: number;
  joins: number;
  participants: number;
  outfits_submitted: number;
  completions: number;
  saves: number;
  clicks: number;
  click_through_rate: number;
  affiliate: { clicks: number; conversions: number; commission_inr: number };
  by_day: Record<string, number | string>[];
}

export interface AdminStylist {
  id: string;
  name: string;
  phone: string;
  city: string;
  verified: boolean;
  bio: string | null;
  specialties: string[];
  price_per_session_inr: number;
  portfolio_urls: string[];
  applied_at: string | null;
  bookings: number;
  sessions_completed: number;
}

export interface StylistMarketplace {
  days: number;
  by_status: Record<string, number>;
  gmv_inr: number;
  commission_inr: number;
}
