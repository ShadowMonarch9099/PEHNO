-- ============================================================
-- PEHNO — Supabase Database Migration (Phase 1)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Enums ──────────────────────────────────────────────────────────────────────

CREATE TYPE gender_enum AS ENUM ('female', 'male', 'other');
CREATE TYPE body_type_enum AS ENUM ('petite', 'regular', 'tall', 'plus');
CREATE TYPE skin_tone_enum AS ENUM ('fair', 'wheatish', 'medium', 'dark');
CREATE TYPE subscription_tier_enum AS ENUM ('free', 'plus', 'pro');
CREATE TYPE garment_condition_enum AS ENUM ('new', 'good', 'worn');

-- ── Users Table ────────────────────────────────────────────────────────────────

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    name VARCHAR(255) NOT NULL DEFAULT '',
    city VARCHAR(100) NOT NULL DEFAULT 'Mumbai',
    gender gender_enum NOT NULL DEFAULT 'female',
    body_type body_type_enum NOT NULL DEFAULT 'regular',
    skin_tone skin_tone_enum NOT NULL DEFAULT 'medium',
    regional_style VARCHAR(100) NOT NULL DEFAULT 'pan_india_fusion',
    subscription_tier subscription_tier_enum NOT NULL DEFAULT 'free',
    subscription_expires_at TIMESTAMP,
    fcm_token VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT true,
    onboarding_complete BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── OTP Store ──────────────────────────────────────────────────────────────────

CREATE TABLE otp_store (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_phone ON otp_store(phone);

-- ── Garments Table ─────────────────────────────────────────────────────────────

CREATE TABLE garments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url VARCHAR(2000) NOT NULL,
    thumbnail_url VARCHAR(2000),
    garment_type VARCHAR(100) NOT NULL DEFAULT 'unknown',
    fabric_type VARCHAR(100) NOT NULL DEFAULT 'unknown',
    color_primary VARCHAR(50) NOT NULL DEFAULT 'unknown',
    color_accent VARCHAR(50),
    occasion_tags TEXT[] NOT NULL DEFAULT '{}',
    season_tags TEXT[] NOT NULL DEFAULT '{}',
    regional_style VARCHAR(100),
    purchase_price NUMERIC(10, 2),
    purchase_date DATE,
    condition garment_condition_enum NOT NULL DEFAULT 'good',
    wear_count INTEGER NOT NULL DEFAULT 0,
    last_worn_at TIMESTAMP,
    ai_confidence FLOAT NOT NULL DEFAULT 0.0,
    classification_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    user_verified BOOLEAN NOT NULL DEFAULT false,
    care_profile JSONB NOT NULL DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_garments_user_id ON garments(user_id);
CREATE INDEX idx_garments_occasion_tags ON garments USING GIN(occasion_tags);
CREATE INDEX idx_garments_season_tags ON garments USING GIN(season_tags);

CREATE TRIGGER update_garments_updated_at
    BEFORE UPDATE ON garments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Outfits Table ──────────────────────────────────────────────────────────────

CREATE TABLE outfits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    garment_ids UUID[] NOT NULL,
    occasion VARCHAR(100) NOT NULL,
    weather_condition VARCHAR(100) NOT NULL DEFAULT '',
    temperature_celsius INTEGER NOT NULL DEFAULT 25,
    festival VARCHAR(100),
    worn_at TIMESTAMP,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    is_saved BOOLEAN NOT NULL DEFAULT false,
    is_daily BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outfits_user_id ON outfits(user_id);
CREATE INDEX idx_outfits_is_saved ON outfits(is_saved);
CREATE INDEX idx_outfits_created_at ON outfits(created_at DESC);

-- ── Festivals Table ────────────────────────────────────────────────────────────

CREATE TABLE festivals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    date_this_year DATE NOT NULL,
    region TEXT[] NOT NULL DEFAULT '{}',
    color_codes JSONB NOT NULL DEFAULT '{}',
    dress_code TEXT NOT NULL,
    occasion_tags TEXT[] NOT NULL DEFAULT '{}',
    description TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_festivals_slug ON festivals(slug);
CREATE INDEX idx_festivals_date ON festivals(date_this_year);

-- ── Seed Festival Data (2025 dates) ───────────────────────────────────────────

INSERT INTO festivals (name, slug, date_this_year, region, color_codes, dress_code, occasion_tags, description) VALUES
(
    'Navratri',
    'navratri',
    '2025-10-02',
    ARRAY['gujarat', 'rajasthan', 'maharashtra', 'pan_india'],
    '{"day1": "#FFD700", "day2": "#228B22", "day3": "#808080", "day4": "#FF8C00", "day5": "#FFFFFF", "day6": "#DC143C", "day7": "#4169E1", "day8": "#FF69B4", "day9": "#800080"}'::jsonb,
    'Traditional Gujarati chaniya choli or lehenga for women. Kediyu-dhoti for men.',
    ARRAY['festival', 'garba', 'dandiya', 'pooja', 'dance'],
    'Nine nights dedicated to Goddess Durga. Known for Garba and Dandiya Raas dances. Each night has a sacred color.'
),
(
    'Diwali',
    'diwali',
    '2025-10-20',
    ARRAY['pan_india'],
    '{"primary": "#DAA520", "accent": "#DC143C", "secondary": "#228B22"}'::jsonb,
    'Traditional Indian ethnic wear — sarees, lehenga cholis, anarkalis, sherwanis. Embellishments encouraged.',
    ARRAY['festival', 'pooja', 'family_gathering', 'celebrations'],
    'Festival of Lights. Five-day celebration marking Lord Rama''s return to Ayodhya. Diyas, fireworks, sweets, and new clothes.'
),
(
    'Dussehra',
    'dussehra',
    '2025-10-02',
    ARRAY['pan_india', 'mysore', 'delhi', 'rajasthan'],
    '{"primary": "#FF8C00", "accent": "#DC143C"}'::jsonb,
    'Traditional ethnic wear. Mysore Dasara features classic Karnataka silk sarees.',
    ARRAY['festival', 'celebration', 'procession', 'outdoor'],
    'Lord Rama''s victory over Ravana. Effigy burning in North India. Grand Mysore Dasara procession in Karnataka.'
),
(
    'Durga Puja',
    'durga-puja',
    '2025-10-01',
    ARRAY['west_bengal', 'assam', 'odisha', 'tripura'],
    '{"primary": "#DC143C", "accent": "#FFFFFF"}'::jsonb,
    'Bengali women wear red-bordered white sarees. Men wear dhoti-kurta.',
    ARRAY['festival', 'pandal_hopping', 'pooja', 'cultural'],
    'West Bengal''s grandest festival. Five-day pandal-hopping celebration with dhunuchi dance and sindoor khela.'
),
(
    'Ganesh Chaturthi',
    'ganesh-chaturthi',
    '2025-08-27',
    ARRAY['maharashtra', 'goa', 'andhra_pradesh', 'karnataka', 'tamil_nadu'],
    '{"primary": "#FFD700", "accent": "#DC143C"}'::jsonb,
    'Nauvari saree for women, dhoti-kurta for men. Silk preferred for main puja.',
    ARRAY['festival', 'pooja', 'procession', 'celebration'],
    'Ganesh Chaturthi celebrates Lord Ganesha''s birth. 10-day festival culminating in grand Ganpati Visarjan.'
),
(
    'Onam',
    'onam',
    '2025-09-05',
    ARRAY['kerala'],
    '{"primary": "#FFFDD0", "accent": "#DAA520"}'::jsonb,
    'White kasavu saree (mundum neriyathum) for women. White dhoti with golden border for men.',
    ARRAY['festival', 'harvest', 'cultural', 'feast'],
    'Kerala harvest festival. Onam Sadya feast, snake boat races, pookalam flower arrangements, and Thiruvathira dance.'
),
(
    'Pongal',
    'pongal',
    '2026-01-14',
    ARRAY['tamil_nadu', 'andhra_pradesh', 'telangana', 'karnataka'],
    '{"primary": "#FFD700", "accent": "#228B22"}'::jsonb,
    'Kanjivaram or Coimbatore cotton sarees for women. Dhoti and angavastram for men. Jasmine flowers a must.',
    ARRAY['festival', 'harvest', 'thanksgiving', 'traditional'],
    'Tamil harvest thanksgiving festival. Cooking sweet pongal in a clay pot. Four-day celebration.'
),
(
    'Holi',
    'holi',
    '2026-03-02',
    ARRAY['pan_india', 'uttar_pradesh', 'rajasthan', 'delhi'],
    '{"primary": "#FF69B4", "accent": "#FFD700", "secondary": "#228B22"}'::jsonb,
    'Old, comfortable white clothing. Do not wear expensive or delicate fabrics.',
    ARRAY['festival', 'outdoor', 'celebration', 'casual'],
    'Festival of Colors. White base to show gulal colors. Holika Dahan followed by Rangwali Holi.'
),
(
    'Eid ul-Fitr',
    'eid-ul-fitr',
    '2026-03-30',
    ARRAY['pan_india', 'hyderabad', 'lucknow', 'kashmir', 'kerala'],
    '{"primary": "#FFFFFF", "accent": "#228B22", "secondary": "#DAA520"}'::jsonb,
    'Men: white kurta-pajama or sherwani. Women: sharara, gharara, anarkali, or embroidered salwar suits.',
    ARRAY['festival', 'namaz', 'family_gathering', 'formal', 'celebration'],
    'End of Ramadan. Communal prayer, Zakat al-Fitr, feasting on sheer khurma. Eid Mubarak greetings exchanged.'
),
(
    'Christmas',
    'christmas',
    '2025-12-25',
    ARRAY['goa', 'kerala', 'meghalaya', 'tamil_nadu', 'pan_india'],
    '{"primary": "#DC143C", "accent": "#228B22", "secondary": "#FFD700"}'::jsonb,
    'Western formal/semi-formal or Indian ethnic wear in Christmas colors. Goa features indo-portuguese outfits.',
    ARRAY['festival', 'church', 'celebration', 'formal', 'family_gathering'],
    'Celebrated across India with midnight masses in Goa and Kerala. Blends Indian and Western festive traditions.'
);

-- ── Row Level Security (RLS) ───────────────────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE garments ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own data
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view own garments"
    ON garments FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own outfits"
    ON outfits FOR ALL USING (auth.uid()::text = user_id::text);

-- Festivals are public read
CREATE POLICY "Festivals are publicly readable"
    ON festivals FOR SELECT USING (true);

-- ── Supabase Storage Bucket ────────────────────────────────────────────────────
-- Run these in Supabase Storage dashboard or CLI:
-- supabase storage create garment-images --private
-- (Bucket is private; serve only via signed URLs)
