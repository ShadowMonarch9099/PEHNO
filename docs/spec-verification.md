# Spec verification

Every requirement in the three source documents (`PHENO.docx` build plan + master/phase prompts,
`Pehno_Product_Blueprint.pdf`, `Pehno_Pitch_Deck.pdf`) checked against the `rebuild/phase-1` branch
on 2026-09-20. Legend: ✅ implemented · ⚠️ implemented differently (reason given) · ⏳ needs an
external account/data, code is ready · ✗ not built (reason given).

## 1. System architecture (docx §Architecture)

| Layer | Requirement | Status | Where |
|---|---|---|---|
| Client | Expo RN, React Navigation, Zustand, Axios | ✅ | `apps/mobile` |
| API gateway | FastAPI, JWT, rate limiting, validation | ✅ | `app/core/security.py`, OTP limiter in `auth_service.py`, Pydantic v2 |
| API gateway | HTTPS enforced | ⏳ | `infra/nginx/nginx.conf` terminates TLS; certificate is a deploy step |
| Core services | Wardrobe / Style engine / Commerce | ✅ | `wardrobe_service`, `outfit_engine` + `outfit_service`, `gap_*` + `affiliate_service` + `scan_service` |
| AI | Fine-tuned ViT | ⚠️ | Pipeline + `train_vit.py` + `eval` are ready; **no labelled Indian dataset exists** so CLIP zero-shot ships (`CLASSIFIER_BACKEND`), rules fallback for CI/no-model. See `packages/ai/README.md` |
| AI | Corrections feed retraining | ✅ | `classification_feedback` table → `scripts/export_training_data.py` |
| AI | Collaborative filtering | ⚠️ | Personalisation is per-user (likes, dislikes, ratings, wear recency, fit) — cross-user CF needs a user base; hook is `outfit_engine.History` |
| AI | Festival AI: 25+ festivals, Navratri tracker, regional dress codes, wedding sub-events | ✅ | `festivals.json` (28), `festival_service.py`, `occasions.json` sub-events |
| Data | Supabase Postgres + Storage | ⚠️ | Dialect-portable SQLAlchemy (SQLite locally, `DATABASE_URL` → Postgres) and a `StorageBackend` seam with `SupabaseStorage`; Supabase wasn't available per your instruction |
| Data | Redis | ✅ | Gap cache + Celery broker (`REDIS_URL`), in-process fallback |
| Data | Pinecone embeddings | ✗ | No similarity-search feature in any build-plan week uses it; scan-mode duplicate detection is rule-based on type/colour/fabric. Add when a feature needs it |
| Jobs | Celery: daily push, classify queue, weekly gap, festival alerts, care reminders | ✅ | `app/tasks/*` + beat schedule; `social_card_generator` too |
| Infra | Docker (api + worker), Railway/Render, GitHub Actions, Nginx | ✅ | `apps/api/Dockerfile`, `infra/Dockerfile.{api,worker}`, `apps/admin/Dockerfile`, `.github/workflows/{test,deploy}.yml`, `infra/nginx` |
| Integrations | OpenWeather, Myntra/Ajio/Nykaa/Meesho affiliate, Razorpay, FCM | ⏳ | All behind provider seams with working local fallbacks; keys in `.env.example` |
| Admin/observability | Next.js admin, PostHog, Sentry | ✅ | `apps/admin`, `analytics.py`, `setup_sentry()` |
| Observability | Mixpanel, Datadog | ✗ | Redundant with PostHog + Sentry + structured logs at this stage; no code hook needed beyond env |

## 2. Folder structure (docx §Folder structure)

All top-level paths exist: `apps/{mobile,api,admin}`, `packages/{ai,types,config}`, `infra/`, `docs/`.
Mobile `screens/{onboarding,wardrobe,outfit,festival,commerce,stylist,social,settings,travel,brands}`,
`components/{garment,outfit,festival,ui,stylist}`, `hooks`, `store`, `services`, `navigation`, `utils`, `i18n`.
API `routers/`, `services/`, `models/`, `schemas/`, `tasks/`, `core/`. AI `data/`, `training/`, `eval/`, `models/` (git-ignored weights).
Naming differences: `garment_classifier.py` → `services/classifier/` package; `weather_service.py` → `services/weather/` package;
`notification_service.py` → `services/notifications/`.

## 3. Database schema (master + phase prompts)

| Table | Status | Notes |
|---|---|---|
| users (all listed columns) | ✅ | + `language`, `notification_prefs`, stylist fields, `social_sharing_enabled` |
| garments (all listed columns incl. `care_profile` JSON, `ai_confidence`, `user_verified`) | ✅ | + `thumbnail_key`, `brand`, care tracking |
| outfits (`rating` 1–5, `is_saved`, `worn_at`, `festival`) | ✅ | `rating` + `feedback` (±1) both exist; `POST /outfits/{id}/rate` and `/feedback` |
| festivals | ⚠️ | JSON is the calendar (spec note 4); `festival_date_overrides` is the per-year correction table the note asks for, edited from admin **Festivals** |
| stylist_bookings + users stylist columns | ✅ | + payment refs, payout ledger (`payout_status/paid_at/ref`) |
| affiliate_clicks | ✅ | + `affiliate_url`, conversion fields, `color`, `fabric` |
| brand_partners / brand_campaigns (+ entries, events) | ✅ | |
| Migrations | ✅ | Alembic, 14 revisions, apply on a clean DB in CI |

## 4. Knowledge base

| File | Spec | Status |
|---|---|---|
| festivals.json | 25 named festivals, Navratri 9 colours (yellow, green, grey, orange, white, red, royal blue, pink, purple) | ✅ 28 (the 25 + Teej, Puthandu, Vishu for Tier-2); dates 2025–2027 |
| fabric_weather.json | 14 fabrics + silk | ✅ 15 |
| occasions.json | 16 slugs incl. beach, hill_station, temple + wedding sub-events | ✅ 16; `label_hi`, men's `garment_preference` and `men_notes` |
| garment_labels.json | saree … gharara (16) + male list | ✅ 23 (spec's 16 + kurta_pyjama, pathani_suit, pyjama, tshirt, jeans; `casual_kurta` is a kurta subcategory) |
| Extra | — | `care_profiles.json`, `color_harmony.json`, `climatology.json`, `cities.json`, `destinations.json`, `fit_guidance.json`, `i18n_hi.json` |

## 5. API endpoints

| Router | Spec endpoints | Status |
|---|---|---|
| /auth | send-otp, verify-otp, refresh, logout | ✅ (+ logout-all) |
| /users | me, PUT me, me/stats | ✅ ; `PUT /users/me/subscription` ⚠️ lives under `/billing/{subscribe,cancel,webhook/razorpay}` |
| /wardrobe | upload, list+filters, get, put, delete, wear, underutilized, roi | ✅ (+ confirm, reclassify, cared, care-reminders) |
| /outfits | daily, generate, history, rate, save, saved | ✅ (+ feedback, wear, DELETE save) |
| /festivals | upcoming, {slug}, navratri/today | ✅ ; upcoming carries `Cache-Control: private, max-age=21600` |
| /commerce | gap-report, affiliate-links, affiliate-click, scan | ✅ ; scan is `POST /commerce/scan` (multipart) **and** `POST /commerce/scan/base64` (spec JSON shape); + affiliate-conversion postback |
| /stylists | list, {id}, book, bookings/my, apply, my-wardrobe-access/{booking} | ✅ (+ incoming, cancel, complete, review, specialties, me) |
| /social | share-card, feed/city | ✅ (+ like, preferences, public `/s/{slug}`) |
| /travel | packing-list | ✅ (+ plans CRUD, destinations) |
| /brands | list, campaign create, performance | ✅ admin side under `/admin/brands…`, `/admin/campaigns/{id}/performance`; user side `/brands/campaigns…` |
| Auth rule | everything but /auth requires JWT | ✅ (`/meta/*` vocab and `/s/{slug}` share pages are the deliberate public exceptions) |

## 6. Core services (prompt checklists)

- **garment_classifier**: image bytes/base64 ✅, ViT base with fine-tune path ✅ (`vit.py`), rule-based fallback ✅, care profile lookup ✅, gender-scoped labels ✅.
- **outfit_engine**: weather (fabric×season) ✅, occasion ✅, colour harmony ✅, festival override ✅ (festival context passed for festival looks and daily looks within the alert window via `festival_service`), personalisation (likes/dislikes/ratings, recent-wear penalty, never-worn boost) ✅, composition top+bottom+layer / full+layer, top-3 ✅; extra layers: fit guidance, city style.
- **festival_service**: JSON load ✅, regional relevance ✅, Navratri colour + matches ✅, 3–5 curated looks ✅, alerts 14/7/1 days ✅ (spec text says "14 days"; prompt says 14, 7, 1), per-year overrides ✅.
- **gap_analyzer**: combination graph ✅, single-type unlock scoring ✅, weights: combos × occasion history × budget ✅ (budget is a hard ordering — affordable first, over-budget kept visible), top-5 with rationale ✅, Redis cache `gap:{user}` ✅, invalidate on 3+ new garments ✅, gender-scoped ✅.
- **weather_service**: OpenWeather client ✅, climatology fallback ✅, fabric mapping (`fabric_tip`) ✅.
- **affiliate_service**: platform URL patterns with env IDs ✅, network template ✅, product cards ✅ (search cards until partner feeds exist — spec note 5), gendered queries ✅.
- **social_service**: card (collage, item tags, occasion/festival header, PEHNO watermark) ✅, signed storage URL ✅, city feed (recency, 50) ✅, quality gate (verified or confidence > 0.8) ✅.
- **travel_planner**: weather + cultural context ✅ (`destinations.json`, 20 clusters incl. Rajasthan wedding / Goa / Bengaluru offsite), 12–15 items → 18–25 looks ✅ (solver, measured), fabric-weather aware ✅, versatility ✅, gaps reuse `gap_analyzer` ✅.
- **purchase (auto-add)**: conversion postback creates the wardrobe entry with a placeholder tile and pushes "unlocks N outfits" ✅.

## 7. Celery tasks

daily_outfit_push (07:30 IST, localised copy) ✅ · classify (async after upload) ✅ · festival_alert (09:00; 14/7/1 days) ✅ · care_reminder (thresholds from `care_profiles.json`: cotton 5, silk 2, banarasi 2, polyester 7, linen 4) ✅ · weekly_gap_report (Mon 08:00, Plus/Pro) ✅ · social_card_generator (on save, when sharing enabled) ✅ · billing_reconcile ✅. All honour `users.notification_prefs`; all pushes deep-link.
Push copy differs from the prompt's literal strings ("Good morning! Here's your outfit…") — ours includes the weather and the pieces; easy to change in `tasks/*.py`.
Spec's "push update via Supabase realtime" after classification ⚠️ → the app polls pending garments (`usePendingPoll`); no Supabase.

## 8. Mobile screens & components

| Spec screen | Status / where |
|---|---|
| Onboarding: Welcome, Phone, OTP, ProfileSetup, BodyType, SkinTone, StyleAffinity, WardrobeIntro | ✅ (`screens/onboarding`); BodyType is API-driven per gender; StyleAffinity pre-selects by city |
| Wardrobe: WardrobeHome (grid, filters in a BottomSheet, count, FAB), Upload, GarmentDetail, GarmentEdit | ✅ ; ClassifyingScreen ⚠️ → inline "Classifying…" state on the card + pending poll (no blocking screen, per rule "never make the user wait") |
| Outfit: DailyLook, OccasionPicker, OutfitResult, OutfitHistory (with 5-star rating), SavedOutfits | ✅ (Saved = History with `saved` param) |
| Festival: FestivalHome, FestivalDetail, NavratriTracker | ✅ |
| Commerce: GapReport, GapItem, ScanMode, ROI | ✅ |
| Stylist: Marketplace (StylistList), Profile, Booking (BookSession), Confirmation (in-flow), + MyBookings, Apply, Incoming, ClientWardrobe | ✅ |
| Social: OOTDFeed (tap item → details + "Shop similar"), ShareOutfit (native share sheet, copy link) | ✅ |
| Travel: TravelPlanner, PackingList (TravelPlan, grouped by role, gaps with affiliate cards), + TravelHome | ✅ |
| Brands: Campaigns, CampaignDetail with "Brand Partner" label | ✅ (entry from DailyLook; there is no separate Commerce tab — commerce lives in the Wardrobe tab) |
| Settings: SettingsHome, Subscription, NotificationPrefs | ✅ |
| Components: GarmentCard (FabricBadge, OccasionTag chips, wear count), FabricBadge, OccasionTag, OutfitCard, WeatherTag/WeatherCard, OutfitRating, FestivalBanner, ColorDot, FestivalLookCard, PrimaryButton, SecondaryButton, BottomSheet, LoadingOverlay, UpgradePrompt/LockedFeature, LazyImage | ✅ |
| Stores: user (auth), wardrobe, outfit, festival, + meta, onboarding, i18n | ✅ |
| Navigation: Auth → Onboarding → 4 tabs; deep links for pushes | ✅ (`pehno://` + `https://app.pehno.in`) |
| Design system colours | ⚠️ | Theme uses the `frontend/` prototype's palette (`#964900` primary, `#fff8f1` cream) rather than the prompt's `#8B4513/#FDF8F0` — same warm-brown/cream family, kept for consistency with the existing design reference |
| Offline: daily outfit + last 7 days, wardrobe grid, vocab in AsyncStorage | ✅ |
| Hindi | ✅ | Custom `src/i18n` instead of react-i18next (no extra dependency; same API shape). Core surfaces translated; secondary screens fall back to English (checklist item) |

## 9. Admin dashboard

/dashboard ✅ · /users ✅ (search, tier filter, wardrobe view) · /analytics ✅ (growth, outfits/day, affiliate CTR, funnel, **stylist bookings, commission by month, shares by city, users by city Tier 1/2**) · /brands ✅ (partners with logo/affiliate id/categories/total clicks, campaign CMS, performance) · /stylists ✅ (queue, verify/reject with email, earnings + commission per stylist, **payouts due → mark paid**) · /festivals ✅ (calendar + per-year date overrides). NextAuth (Google restricted to `ADMIN_EMAIL_DOMAIN`, dev password locally) ✅, Recharts ✅, Tailwind ✅.

## 10. Docker / CI / env

- compose: api, worker, beat, redis, db, **flower :5555**, **admin :3000** ✅
- `.env.example`: every variable in the spec list (`SUPABASE_URL/ANON_KEY/SERVICE_KEY`, `OPENWEATHER_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `RAZORPAY_*`, `MYNTRA/AJIO/NYKAA/MEESHO_AFFILIATE_ID`, `REDIS_URL`, `JWT_SECRET`, `ADMIN_EMAIL_DOMAIN` (admin app)) ✅ + SMTP, PostHog, Sentry, storage, billing, stylist, social.
- `test.yml`: pip + pytest, ruff, migrations on a clean DB, TypeScript, **ESLint** (mobile + admin), `next build` ✅
- `deploy.yml`: tests → Docker images (api, worker, admin) → Railway (api + worker) → Vercel (admin); each deploy step gated on its secret ✅

## 11. Implementation rules (master prompt §Notes, phase prompts §Rules)

| Rule | Status |
|---|---|
| JWT on all personalised endpoints | ✅ |
| Async classification, return id immediately | ✅ |
| Gap analyzer cached, weekly job, invalidate at 3+ new items | ✅ |
| Festival dates approximate + DB override table | ✅ |
| Affiliate deep links with placeholder IDs, production-shaped | ✅ |
| Pushes actionable via deep links | ✅ |
| Images ≤ 800×800 / 200 KB, 200 px thumbnail | ✅ (`IMAGE_MAX_SIDE`, `IMAGE_TARGET_BYTES`, `THUMBNAIL_SIDE`) |
| Gated features locked, never hidden | ✅ (402 + `LockedFeature`) |
| Offline daily outfit + wardrobe cache | ✅ |
| Private images, signed URLs only | ✅ |
| Razorpay webhook signature verification | ✅ |
| Scan reuses the classifier | ✅ |
| Stylist wardrobe access strictly scoped (confirmed only; first name + city + garments) | ✅ |
| Watermark on every card | ✅ |
| Social feed only for verified / > 0.80 confidence pieces | ✅ |
| Travel gaps reuse gap_analyzer | ✅ |
| Male data-collection placeholder README in `packages/ai/training/` | ✅ `DATA_COLLECTION.md` |
| Sponsored content labelled "Brand Partner" | ✅ |
| Payouts: platform 20%, 80% released after completion | ✅ ledger + admin action (money movement itself needs Razorpay Route — checklist) |

## 12. Build-plan week blocks

Weeks 1–52: see [progress.md](progress.md) — every block ✅ with deliverables listed; deviations noted there and in [decisions.md](decisions.md).

## 13. Blueprint / pitch-deck items outside the build plan

- Free tier "shopping scan 5/month" (blueprint) vs "scan is Pro" (build plan, Phase-2 prompt) → **build plan wins** (Pro). Gap analysis: build plan bullet says Pro, Phase-2 prompt says Plus → **Plus** (the more detailed prompt; also matches the blueprint's "Plus … travel packing" grouping). Both are one-line changes in `entitlements.FEATURE_TIERS`.
- "Primary wardrobe needs (daily, professional, festive)" onboarding question, camera-based skin-tone detection, barcode scanning: ✗ — not in any build-plan week; noted as future work.
- Success-gate metrics (7-day return ≥ 60 %, push open > 30 %, acceptance > 80 %): measured by `scripts/mvp_metrics.py` ✅.

## What still needs a human / an account

Supabase, Razorpay (subscriptions + Payment Links + Route), MSG91, OpenWeather, Firebase, PostHog, Sentry, affiliate network approvals, EAS/Play/App Store — all in [launch-checklist.md](launch-checklist.md). Plus: a labelled photo set for the classifier (the one item that changes product quality more than any other), native-speaker review of the Hindi strings, and local validation of the city style profiles.
