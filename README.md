<div align="center">

# 🇮🇳 PEHNO — पहनो
### AI Wardrobe Intelligence Platform for India

*Never wonder what to wear again.*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![React Native](https://img.shields.io/badge/React_Native-Expo_52-61DAFB?style=for-the-badge&logo=react)](https://expo.dev)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

</div>

---

## 📱 What is PEHNO?

**PEHNO** (Hindi: *पहनो* — "to wear") is an AI-powered wardrobe intelligence platform built specifically for Indian users. It solves one of the most universally relatable daily problems — *"What should I wear today?"* — with deep contextual intelligence tailored for India's rich textile traditions, regional festivals, diverse climate zones, and cultural occasions.

### The Problem
- Indian women own an average of 60–80 garments but feel like they have "nothing to wear"
- Festival and wedding season wardrobe planning causes significant stress
- Expensive ethnic wear sits unused — poor cost-per-wear returns
- Western wardrobe apps have zero understanding of Indian fabrics, occasions, or climate

### The Solution
PEHNO acts as your personal AI stylist that:
- 📸 **Classifies** every garment automatically using computer vision
- 🌤️ **Suggests** weather-aware outfits every morning at 7:30 AM
- 🪔 **Tracks** 10 Indian festival calendars with curated looks from *your* wardrobe
- 🌸 **Understands** Indian fabrics — Banarasi, Kanjeevaram, Khadi, Kanjivaram, Chanderi
- 💰 **Tracks** cost-per-wear so you know what's actually worth buying

---

## ✨ Core Features

### 🤖 AI Garment Classification
- Uses **Google ViT (Vision Transformer)** — `google/vit-base-patch16-224` via HuggingFace
- Falls back to a robust **rule-based classifier** when ML confidence is low
- Classifies: garment type, fabric, primary color, accent color, occasion tags, season tags, regional style
- Generates **care profiles** (wash temperature, iron settings, dry-clean flag, storage tips)
- Every classification trains the next iteration

### ✨ 5-Layer Outfit Engine
Generates outfits through a multi-layer intelligent pipeline:
1. **Layer 1 — Weather Filter**: Filters by fabric-weather compatibility (cotton in summer, velvet avoided in monsoon)
2. **Layer 2 — Occasion Filter**: Matches garments to the target occasion (pooja, office, wedding, festival)
3. **Layer 3 — Color Harmony**: Applies complementary and analogous color theory to Indian garments
4. **Layer 4 — Festival Override**: Boosts festival-appropriate garments near cultural events
5. **Layer 5 — Personalization**: Penalizes recently worn items, rewards user-verified data, boosts new/unworn pieces

### 🪔 Indian Festival Intelligence
Built-in knowledge base for **10 major Indian festivals**:
| Festival | Date 2025 | Region |
|----------|-----------|--------|
| Navratri | Oct 2–10 | Gujarat, Rajasthan, Pan-India |
| Diwali | Oct 20 | Pan-India |
| Dussehra | Oct 2 | Pan-India |
| Durga Puja | Oct 1 | West Bengal, Assam |
| Ganesh Chaturthi | Aug 27 | Maharashtra, Karnataka |
| Onam | Sep 5 | Kerala |
| Pongal | Jan 14, 2026 | Tamil Nadu, AP |
| Holi | Mar 2, 2026 | Pan-India |
| Eid ul-Fitr | Mar 30, 2026 | Pan-India |
| Christmas | Dec 25 | Goa, Kerala |

**Navratri Tracker**: 9-day color grid tracker matching each sacred color (Pratipada → Navami) with garments from your wardrobe.

### 🌤️ Weather Intelligence
- Real-time weather via **OpenWeatherMap API**
- Fabric-weather compatibility matrix covering 20+ Indian fabrics
- Seasonal recommendations: Summer / Monsoon / Winter / Transition
- Supports **20 Indian cities** with IST-based scheduling

### 💰 Cost-Per-Wear Analytics
- Track `purchase_price` and `wear_count` per garment
- Auto-computes CPW: ₹1500 saree ÷ 30 wears = **₹50/wear**
- Surfaces the "true value" of your wardrobe

---

## 🏗️ Architecture

```
pehno/
├── apps/
│   ├── api/                    ← FastAPI Backend
│   │   ├── app/
│   │   │   ├── core/           ← Config, DB, Auth
│   │   │   ├── models/         ← SQLAlchemy ORM
│   │   │   ├── schemas/        ← Pydantic v2
│   │   │   ├── routers/        ← API endpoints
│   │   │   ├── services/       ← AI + Business logic
│   │   │   └── tasks/          ← Celery async tasks
│   │   ├── migrations/         ← Supabase SQL
│   │   └── main.py
│   ├── mobile/                 ← React Native Expo App
│   │   ├── src/
│   │   │   ├── screens/        ← 20 screens
│   │   │   ├── components/     ← UI component library
│   │   │   ├── store/          ← Zustand state
│   │   │   ├── services/       ← Axios API client
│   │   │   ├── navigation/     ← React Navigation
│   │   │   └── theme/          ← Design system
│   │   └── App.tsx
│   └── admin/                  ← Next.js dashboard (Phase 2)
└── packages/
    ├── ai/
    │   └── data/               ← Indian knowledge base JSONs
    ├── types/                  ← Shared TypeScript types
    └── config/                 ← ESLint + Prettier
```

---

## 🛠️ Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Framework | FastAPI 0.104 (async) |
| ORM | SQLAlchemy 2.0 (async) |
| Validation | Pydantic v2 |
| Database | Supabase (PostgreSQL 15) |
| File Storage | Supabase Storage (private bucket, signed URLs) |
| Auth | JWT (OTP-based, no password) |
| Task Queue | Celery + Redis |
| Task Schedule | Celery Beat (IST timezone) |
| AI/ML | HuggingFace ViT (`google/vit-base-patch16-224`) |
| Push Notifications | Firebase Admin SDK (FCM) |
| Weather | OpenWeatherMap API |
| Image Processing | Pillow (compress to 800×800, 200KB) |
| Monitoring | Flower (Celery dashboard) |

### Mobile
| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo SDK 52 |
| Language | TypeScript 5.3 |
| State | Zustand 4 |
| Navigation | React Navigation v6 (native stack + bottom tabs) |
| HTTP | Axios (JWT interceptors + auto-refresh) |
| Storage | Expo SecureStore (tokens) |
| Camera | Expo ImagePicker + Camera |
| Notifications | Expo Notifications (FCM) |
| Deep Linking | `pehno://` custom scheme |

### Infrastructure
| Layer | Technology |
|-------|-----------|
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions → Railway |
| Database | Supabase (managed PostgreSQL + Row Level Security) |

---

## 📁 API Reference

### Auth
```
POST /auth/send-otp      → Send OTP to phone number
POST /auth/verify-otp    → Verify OTP, get JWT tokens
POST /auth/refresh       → Refresh access token
POST /auth/logout        → Invalidate token
```

### Users
```
GET    /users/me         → Get current user profile
PUT    /users/me         → Update profile (city, style, body type)
GET    /users/me/stats   → Wardrobe stats (total, CPW, top occasion)
```

### Wardrobe
```
POST   /wardrobe/upload       → Upload garment image → triggers AI classification
GET    /wardrobe              → List garments (filter: occasion, fabric, season)
GET    /wardrobe/{id}         → Get garment detail
PUT    /wardrobe/{id}         → Update garment (user correction, verified=true)
DELETE /wardrobe/{id}         → Delete garment
POST   /wardrobe/{id}/wear    → Log a wear event
```

### Outfits
```
GET    /outfits/daily         → Get today's AI outfit + weather context
POST   /outfits/generate      → Generate outfit for occasion
GET    /outfits/history       → Paginated outfit history
POST   /outfits/{id}/rate     → Rate outfit (1–5 stars)
POST   /outfits/{id}/save     → Save/bookmark outfit
GET    /outfits/saved         → Get saved outfits
```

### Festivals
```
GET    /festivals/upcoming       → Upcoming festivals with days_until
GET    /festivals/{slug}         → Festival detail + curated looks
GET    /festivals/navratri/today → Today's Navratri color + matching garments
```

---

## 📱 Mobile App Screens

### Onboarding Flow (8 screens)
1. **WelcomeScreen** — Hero with emoji garment cards, feature list
2. **PhoneScreen** — +91 prefix, Indian number validation (starts with 6–9)
3. **OTPScreen** — Visual 6-box OTP input, 60s resend timer, auto-verify
4. **ProfileSetupScreen** — Name, city picker (20 cities), gender
5. **BodyTypeScreen** — Visual cards: Petite / Regular / Tall / Plus with style tips
6. **SkinToneScreen** — 6 color swatches with personalized color advice
7. **StyleAffinityScreen** — 5 regional styles: Rajasthani / South Indian / Punjabi / Mumbai Minimal / Pan-India Fusion
8. **WardrobeIntroScreen** — How it works steps + 30-item goal progress bar

### Wardrobe Tab (5 screens)
- **WardrobeHome** — 2-column grid with 3-tab filter (Occasion / Fabric / Season) + FAB upload
- **Upload** — Camera capture + bulk gallery (up to 10), photo tips, preview grid
- **Classifying** — Pulsing AI animation with status messages cycle
- **GarmentDetail** — Image, stats (wear count, CPW, value), care profile, occasion tags
- **GarmentEdit** — Chip pickers for type/fabric/condition, multi-select occasions, manual correction

### Outfits Tab (5 screens)
- **DailyLook** — Greeting + weather card (temp, fabric recommendations) + outfit collage
- **OccasionPicker** — 9 occasion cards (pooja, office, wedding, festival, campus…)
- **OutfitResult** — Multi-option tabs for 3 outfit variants, star rating, save bookmark
- **OutfitHistory** — Date-labeled outfit cards with weather context
- **SavedOutfits** — Bookmarked outfit collection

### Festivals Tab (3 screens)
- **FestivalHome** — Live Navratri color tracker card + upcoming festival countdown banners
- **FestivalDetail** — Hero with color swatches, dress code, description, curated looks
- **NavratriTracker** — 9-day color grid (today glows), matching garments from wardrobe

### Settings Tab (4 screens)
- **SettingsHome** — Profile card with subscription tier badge
- **NotificationPrefs** — Toggle: daily outfit push / festival alerts / care reminders
- **SubscriptionScreen** — Free / Plus (₹149/mo) / Pro (₹399/mo) comparison

---

## 🌟 Indian Knowledge Base

Located in `packages/ai/data/`:

### `garment_labels.json`
Complete Indian garment taxonomy — 30+ garment types including:
Saree, Salwar Suit, Kurti, Lehenga, Anarkali, Churidar, Indo-Western, Palazzo, Dupatta, Ghagra, Kanjivaram (and regional variants)

### `fabric_weather.json`
Fabric-weather compatibility matrix:
- **Summer (>35°C)**: Cotton, Linen, Khadi, Chanderi
- **Monsoon**: Georgette, Chiffon, Crepe, Polyester
- **Winter (<15°C)**: Velvet, Wool, Silk, Banarasi
- **All-season**: Cotton Silk, Raw Silk

### `festivals.json`
10 festivals with:
- Exact 2025/2026 dates
- Regional relevance mapping
- Sacred color codes (Navratri 9-day sequence)
- Dress codes tailored by regional tradition
- Occasion tags for outfit matching

### `occasions.json`
Indian occasion taxonomy:
`casual` · `office` · `wedding_guest` · `pooja` · `festival` · `formal` · `night_out` · `campus` · `temple` · `festive_lunch` · `mehndi` · `sangeet` · `reception`

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker + Docker Compose
- Expo Go app (for mobile testing)

### 1. Clone and set up

```bash
git clone https://github.com/ShadowMonarch9099/PEHNO.git
cd PEHNO
git checkout feat/phase-1-mvp-foundation
```

### 2. Backend setup

```bash
cd apps/api
cp .env.example .env
# Fill in your keys in .env

# Option A: Docker (recommended)
docker-compose up

# Option B: Local dev
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend runs at: `http://localhost:8000`  
API Docs (Swagger): `http://localhost:8000/docs`

### 3. Database setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and paste contents of `apps/api/migrations/001_initial_schema.sql`
3. Run — this creates all tables, indexes, RLS policies, and seeds 10 festivals
4. Create a private Storage bucket named `garment-images`

### 4. Mobile setup

```bash
cd apps/mobile
npm install

# Set your API URL
echo "EXPO_PUBLIC_API_URL=http://localhost:8000" > .env

# Start Expo
npx expo start
```

Scan the QR code with Expo Go on your phone.

### 5. Required Environment Variables

```env
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
DATABASE_URL=postgresql+asyncpg://postgres:password@...

# Auth
JWT_SECRET=your-32-char-secret-key

# Redis (for Celery)
REDIS_URL=redis://localhost:6379/0

# External APIs
OPENWEATHER_API_KEY=...      # openweathermap.org/api
HF_API_TOKEN=...             # huggingface.co/settings/tokens

# Firebase (Push Notifications)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

---

## ⚙️ Background Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| `classify_garment` | On upload (async) | Run ViT AI on new garment images |
| `push_daily_outfits` | 7:30 AM IST daily | Generate + FCM push daily outfit to all users |
| `send_festival_alerts` | 9:00 AM IST daily | Alert users 14, 7, and 1 day before festivals |

Start workers:
```bash
# Worker
celery -A app.celery_app.celery_app worker --loglevel=info

# Beat (scheduler)
celery -A app.celery_app.celery_app beat --loglevel=info

# Monitor (Flower dashboard at :5555)
celery -A app.celery_app.celery_app flower
```

---

## 🗄️ Database Schema

```
users          → phone, city, gender, body_type, skin_tone, regional_style, subscription_tier
garments       → user_id, image_url, garment_type, fabric_type, color_primary, occasion_tags,
                 season_tags, wear_count, ai_confidence, care_profile, classification_status
outfits        → user_id, garment_ids[], occasion, weather_condition, temperature, rating, is_saved
festivals      → name, slug, date_this_year, region[], color_codes, dress_code, occasion_tags
otp_store      → phone, otp_hash, expires_at, is_used
```

All tables have **Row Level Security (RLS)** — users can only read/write their own data.

---

## 🔒 Security

- **OTP-based auth** — no passwords stored anywhere
- **JWT tokens** — short-lived access (24h) + long-lived refresh (30d)
- **Row Level Security** — Supabase enforces data isolation at DB level
- **Private image bucket** — garment photos served only via time-limited signed URLs
- **Bcrypt OTP hashing** — OTPs are hashed before storage

---

## 🛣️ Roadmap

### Phase 1 (Current) ✅
- [x] Monorepo scaffold
- [x] FastAPI backend with 5 routers, ~40 endpoints
- [x] AI garment classifier (ViT + rule-based fallback)
- [x] 5-layer outfit engine
- [x] Festival calendar + Navratri tracker
- [x] Celery async tasks + beat scheduler
- [x] Full React Native mobile app (20 screens)
- [x] Supabase database migration with RLS
- [x] Docker + GitHub Actions CI/CD

### Phase 2 (Next)
- [ ] SMS OTP via Twilio / MSG91
- [ ] Razorpay subscription payments
- [ ] Admin dashboard (Next.js)
- [ ] Supabase Realtime for classification status
- [ ] Style recommendations using outfit ratings ML feedback
- [ ] Outfit sharing & social features
- [ ] Capsule wardrobe builder
- [ ] Shopping suggestions (affiliate links — Myntra, Ajio)

### Phase 3
- [ ] Regional language support (Hindi, Tamil, Bengali, Gujarati)
- [ ] Try-on AR feature
- [ ] Personal stylist chat (GPT-4 powered)
- [ ] Family wardrobe mode
- [ ] B2B: boutique and brand partnerships

---

## 📊 Business Model

| Tier | Price | Garments | Features |
|------|-------|----------|---------|
| **Free** | ₹0 | 20 | Daily outfit, basic festival calendar |
| **Plus** | ₹149/mo | Unlimited | CPW analytics, all festivals, outfit history |
| **Pro** | ₹399/mo | Unlimited | Body-type intelligence, personal AI stylist, family wardrobe |

---

## 🤝 Contributing

This is a private MVP project. For team contribution:

1. Branch from `feat/*` — never commit directly to `main`
2. Follow conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
3. Run `ruff check .` before pushing Python code
4. Run `npx tsc --noEmit` before pushing TypeScript code

---

## 📄 License

MIT © 2025 PEHNO Technologies Pvt. Ltd.

---

<div align="center">

Made with ❤️ in India 🇮🇳

*Dress with intention. Celebrate with your wardrobe.*

</div>
