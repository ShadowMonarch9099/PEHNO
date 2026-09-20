# Build Progress

Tracks each block of [build-plan.md](build-plan.md) against the `rebuild/phase-1` branch.
Status: ✅ done · 🔧 in progress · ⬜ not started · ⚠️ deviates from plan (see note)

## Phase 1 — MVP

| Block | Status | Notes |
|---|---|---|
| Weeks 1–2 — Setup & infrastructure | ✅ | See below. ⚠️ Local SQLite instead of Supabase (see [decisions.md](decisions.md#local-database)). Railway deploy job exists but is inert until `RAILWAY_TOKEN` is set. |
| Weeks 3–4 — Onboarding flow | ✅ | ⚠️ Client-side image resize deferred (server resizes; picker sends JPEG q=0.85). Classification is stubbed as `pending` until weeks 5–7. |
| Weeks 5–7 — Garment AI | ✅ pipeline / ⚠️ model | ⚠️ No labelled Indian dataset exists yet, so no fine-tuned ViT. Shipping CLIP zero-shot as the MVP model (40% on a 5-photo smoke set — see [packages/ai/README.md](../packages/ai/README.md)); training + eval scripts are ready. The 85% gate is blocked on collecting a labelled eval set. |
| Weeks 8–9 — Style engine v1 | ✅ | ⚠️ No OpenWeather key / Firebase creds available: weather falls back to a per-city monthly climatology table, push to a console notifier. Both switch on via env. Celery beat schedule defined; run `scripts/run_daily_push.py` locally. |
| Weeks 10–11 — Festival intelligence | ✅ | ⚠️ Lunar-calendar dates for 2025–2027 are hand-entered and must be re-verified each year (`packages/ai/data/festivals.json`). |
| Week 12 — Polish & launch | ✅ code / ⬜ ops | Store submission, PostHog/Firebase/MSG91 accounts and the 100-user cohort need accounts and people — see [launch-checklist.md](launch-checklist.md). |

### Weeks 1–2 deliverables
- [x] Monorepo per spec: `apps/api`, `apps/mobile`, `packages/*`, `infra/`, `docs/`
- [x] Schema: `users`, `garments`, `outfits`, `festivals`, `otp_codes`, `refresh_tokens` — Alembic-managed, dialect-portable (SQLite + Postgres)
- [x] Auth: OTP login (`/auth/send-otp`, `/auth/verify-otp`), JWT access + rotating refresh tokens, `/auth/refresh`, `/auth/logout`, `/auth/logout-all`; rate-limited; attempt-limited; pluggable SMS provider (console now, MSG91 wired)
- [x] Users: `/users/me` GET/PUT, `/users/me/stats`
- [x] Storage interface: local filesystem (served at `/media`) now, Supabase Storage adapter ready
- [x] Sentry hook (`SENTRY_DSN`), structured logging
- [x] Tests: 23 API tests on in-memory SQLite; CI runs lint + format + tests + migration check + mobile typecheck
- [x] Mobile: Expo scaffold, theme + UI kit (from team design), typed API client with single-flight token refresh, secure token storage, auth store, root navigation (Auth → Onboarding → Main), Welcome / Phone / OTP screens wired to the API

### Weeks 3–4 deliverables
- [x] Onboarding: ProfileSetup (name, searchable city picker, gender) → BodyType → SkinTone → StyleAffinity → WardrobeIntro; answers saved via `PUT /users/me`, `onboarding_complete` flips the root navigator
- [x] `packages/ai/data/cities.json` (20 launch cities with region + lat/lon for weather later) and `/meta/cities`, `/meta/wardrobe-options` so pickers share the API vocabulary
- [x] Upload pipeline: `POST /wardrobe/upload` (1–10 files, per-file accept/reject), Pillow validate → EXIF-orient → RGB → ≤1024px JPEG ≤300KB + 320px thumbnail → storage backend
- [x] Wardrobe API: list with occasion/fabric/season/type/status filters + pagination (dialect-portable JSON containment), get, update (vocabulary-validated; classification edits set `user_verified`), delete (removes files), wear log, cost-per-wear
- [x] Mobile: WardrobeHome (2-col grid, filter tabs, 30-item goal bar, FAB), Upload (camera / multi-gallery, preview grid, progress, partial-reject alert), GarmentDetail (stats, details, wear/edit/delete), GarmentEdit (chip pickers, price, notes), SettingsHome (profile + sign out)
- [x] 11 new API tests (34 total)

### Weeks 5–7 deliverables
- [x] Classifier pipeline `apps/api/app/services/classifier`: deterministic colour extraction → pluggable vision backend (`rules` / `zero_shot` CLIP / `vit`) → knowledge rules (occasions, seasons, regional style, care)
- [x] `packages/ai/data/care_profiles.json` (per-fabric care incl. monsoon), `silk` added to fabric matrix
- [x] Async classification: upload returns immediately (`pending`); job runs via Celery when `CELERY_BROKER_URL` is set, otherwise as an in-process background task. `POST /wardrobe/{id}/reclassify`
- [x] Correction loop: `classification_feedback` table populated on every AI-vs-user label difference; `POST /wardrobe/{id}/confirm` for positive signal; `ai_labels` snapshot kept on the garment
- [x] `scripts/export_training_data.py` → JSONL + images; `packages/ai/training/train_vit.py` (HF Trainer, taxonomy-locked labels); `packages/ai/eval/evaluate.py` (accuracy, per-class recall, confusion, 85% gate)
- [x] Mobile: AI suggestion card (confirm / pick alternative / edit / retry), polling while pending, care section on GarmentDetail
- [x] 21 new tests (55 total); verified live with real Wikimedia photos through the API
- [ ] **Open:** collect a labelled eval set (≥30 phone photos per garment type) — the first data task for the team

### Weeks 8–9 deliverables
- [x] `outfit_engine.py`: 5 scoring layers (weather, occasion, colour + skin tone, festival, personalisation) + composition by garment role (`full`, `full+layer`, `top+bottom(+layer)`); score floor drops clearly-wrong options; stable daily seed; "show me another" exclusion
- [x] Knowledge base: `role`/`layer_ok` on garment types, `color_harmony.json`, `climatology.json`, festival `colors`
- [x] Weather service: OpenWeather (lat/lon from cities.json, 30-min cache) → climatology fallback; season inference
- [x] `/outfits`: daily (stable per day, regenerate), generate (occasion + optional festival, 1–5 options), feedback ±1, save/unsave, wear (logs garment wears, counts as like), history, saved
- [x] Notifications: console / FCM behind one interface; `pehno.push_daily_outfits` Celery task on a 07:30 IST beat; manual runner script
- [x] Mobile: DailyLook (weather card, look, like/dislike/save/wear, show-me-another), OccasionPicker, OutfitResult (3 looks as tabs), OutfitHistory / Saved; OutfitCard + WeatherCard components
- [x] 19 new tests (74 total); verified live

### Weeks 10–11 deliverables
- [x] Knowledge base: concrete 2025–2027 dates, durations, lunar flag, colour slugs for all 10 festivals
- [x] `festival_service`: occurrence calendar (active window, roll-over), regional relevance from cities.json state/region, upcoming (region first), Navratri nine-colour sequence derived from the Pratipada weekday (matches published 2025 order), 14/7/1-day alert schedule
- [x] `/festivals/upcoming`, `/festivals/{slug}` (detail + 3–5 looks curated by the engine against the *festival-date* weather), `/festivals/navratri/today` (today's colour + matching garments)
- [x] Festival alert Celery task (09:00 IST) with a `notification_log` table so each (user, festival, year, lead) fires once; manual runner supports `festivals`
- [x] Mobile: FestivalHome (Navratri tracker card, countdown banners with swatches), FestivalDetail (colours, dress code, curated looks), NavratriTracker (9-day grid, matching garments)
- [x] 11 new tests (85 total); verified live

### Week 12 deliverables
- [x] Bug bash: signed expiring URLs for local media (was public), N+1 in outfit lists, OTP lockout persistence, festival-date weather for curated looks, Windows-safe script output
- [x] Analytics: server-side event contract (`app/services/analytics.py`) — PostHog when keyed, logged otherwise; instrumented signup/login, onboarding, upload, classify, correct/confirm, outfit generate/feedback/save/wear, festival view, push sent/opened
- [x] Push open tracking: `notification_log.opened_at`, `POST /notifications/{id}/opened`; every push payload carries `notification_id`; daily push deduped per day
- [x] `scripts/mvp_metrics.py` computes the three MVP gates (7-day return, push open rate, classification acceptance)
- [x] Mobile: push registration + open handling (`services/push.ts`), `eas.json` build/submit profiles, store ids in `app.json`
- [x] `infra/docker-compose.yml` runs API + worker + beat + Postgres + Redis
- [x] `docs/launch-checklist.md`
- [x] 86 tests

## Phase 2 — Commerce (Weeks 13–28)

| Block | Status | Notes |
|---|---|---|
| Weeks 13–14 — Freemium paywall | ✅ | ⚠️ Plus priced ₹199 (plan/deck), not the ₹149 in the old README. Razorpay runs behind a provider interface; the mock provider + `POST /billing/dev/activate` (DEBUG only) stand in until keys and dashboard plan ids exist. |
| Weeks 15–17 — Wardrobe gap analysis | ✅ | ⚠️ The plan asks for qualitative user testing of gap recommendations before the full UI — the UI is built, but the *validation* still needs real users (see launch checklist). Redis cache used when `REDIS_URL` is set; in-process otherwise. |
| Weeks 18–19 — Affiliate commerce | ✅ structure / ⚠️ partners | Myntra/Ajio/Nykaa/Meesho have no public product APIs: cards are curated per-platform *searches* wrapped in a configurable network deep-link template with our click id as `subid`. Real product cards arrive when a partner catalogue is approved (`ProductSource` seam). Admin dashboard app itself is still pending; `/admin/metrics` feeds it. |
| Weeks 20–21 — Fabric care & ROI | ✅ | Care profiles stay free; wear-threshold *reminders* are Plus. |
| Weeks 22–24 — Shopping scan mode | ✅ | Barcode scanning (blueprint's 'extended version') not built — no fabric-composition data source exists. |
| Weeks 25–28 — Festival expansion & cities | ✅ data & engine / ⬜ growth | ⚠️ 15 new lunar dates are hand-entered (2025–2027) — verify yearly. Influencer push in Pune/Hyderabad/Chennai/Kolkata is an ops task. |
| Admin dashboard (Phase 2 pages) | ✅ | Google OAuth needs `GOOGLE_CLIENT_ID/SECRET`; locally a dev password signs in (disabled when `NODE_ENV=production`). |

### Admin dashboard deliverables
- [x] API: `/admin/metrics` (users, DAU, tiers, MRR, affiliate 30d, outfits 24h, classification acceptance), `/admin/users` (search name/phone/city, tier filter, pagination, garment counts, joined/last active), `/admin/users/{id}/wardrobe`, `/admin/analytics` (user growth, outfits by day, affiliate CTR by platform, upload→10→30→paid funnel), `/admin/brands` list/create; `brand_partners` + `brand_campaigns` schema scaffold
- [x] `apps/admin` (Next.js 14 App Router, Tailwind in the PEHNO palette, Recharts): `/dashboard`, `/users`, `/users/[id]`, `/analytics` (7/30/90d), `/brands`; NextAuth with Google restricted to `ADMIN_EMAIL_DOMAIN` + dev-password provider outside production; `withAuth` middleware; server-only API client so `ADMIN_API_KEY` never reaches the browser
- [x] CI job builds the admin app; 1 new API test (136 total); verified in the browser against live data

### Weeks 25–28 deliverables
- [x] `festivals.json` 10 → 25 (Eid ul-Adha, Baisakhi, Janmashtami, Raksha Bandhan, Karva Chauth, Makar Sankranti, Ugadi, Gudi Padwa, Bihu, Lohri, New Year, Maha Shivratri, Ram Navami, Hanuman Jayanti, Guru Nanak Jayanti) with dates, regions, palettes, dress codes; Onam (kasavu) and Pongal (Tamil traditional) dress codes rewritten
- [x] Wedding sub-events in `occasions.json` (mehendi, sangeet, haldi, baraat, reception) with `parent`, `palette`, `avoid_colors`, `garment_preference`, fabric prefs; engine scores palette matches/avoids and falls back to the parent tag; `suits()` (gap / scan / care) inherits the parent
- [x] `cities.json` 20 → 30 (Punjab was missing entirely: Amritsar, Ludhiana; plus Visakhapatnam, Mysuru, Madurai, Vadodara, Patna, Ranchi, Bhopal, Dehradun)
- [x] Mobile: OccasionPicker groups a "Wedding week" section with the five functions
- [x] 5 new tests (135 total)

### Weeks 22–24 deliverables
- [x] `scan_service.py`: image pipeline → the one classifier (rule 5) → hypothetical garment in the combination graph → compatibility 0–100 (share of eligible partners × new looks), `pairs_with`, distinct `new_outfits`, duplicate detection (type+colour = "very similar", +fabric = "near-identical"), fabric-vs-season note for the user's city, buy/maybe/skip verdict with rationale; graceful "unknown" path
- [x] `POST /commerce/scan` (multipart, Pro gate, 413/422 handling)
- [x] Mobile: ScanModeScreen (camera / screenshot, verdict card with stats, duplicate card, pairs carousel, "Bought it → add to wardrobe"), Pro lock preview, wardrobe entry card, `commerce/scan` deep link
- [x] 7 new tests (130 total); verified live with CLIP (recognised an already-owned saree as a duplicate)

### Weeks 20–21 deliverables
- [x] Per-fabric `reminder_after_wears` thresholds in `care_profiles.json` (cotton 5, silk/banarasi 2, polyester 7, …); `wears_since_care`, `last_cared_at`, `care_reminders_enabled` on garments (migration with server defaults)
- [x] `POST /wardrobe/{id}/cared` (reset), `PUT /wardrobe/{id}/care-reminders` (per-item opt-out); `care_due`/`care_threshold` on every garment response
- [x] Sunday 10:00 IST `pehno.send_care_reminders` for Plus/Pro users, one push per threshold crossing, deep-linked to the garment
- [x] `GET /wardrobe/roi` — cost-per-wear leaderboard worst-first with great/ok/poor verdicts relative to the type's price band + summary; `GET /wardrobe/underutilized` — 90+ days idle (or never worn after 30 days) with 1–2 pairing suggestions favouring in-rotation partners
- [x] Mobile: RoiScreen (leaderboard + underutilised tabs), care box + reminder toggle + "I cleaned it" on GarmentDetail, "Wardrobe value" entry on WardrobeHome
- [x] 8 new tests (123 total)

### Weeks 18–19 deliverables
- [x] `affiliate_service.py`: per-platform search URL builders (Myntra, AJIO, Nykaa Fashion, Meesho), budget-aware platform ordering, network template wrapping (`{url}/{subid}/{cid}`) or utm+subid tagging, `ProductSource` interface with `SearchLinkSource` default
- [x] `affiliate_clicks` table; `GET /commerce/affiliate-links` (Plus), `POST /commerce/affiliate-click` (returns tracked URL; click id = network subid), `POST /commerce/affiliate-conversion` postback (shared secret, idempotent) that nudges the user to add the purchase to their wardrobe
- [x] `GET /admin/metrics` (X-Admin-Key): users/DAU/tiers, MRR, active subs, activity, 30-day affiliate clicks/conversions/commission by platform
- [x] Mobile: GapItem "Shop this gap" — colour switcher, per-platform cards with price band, tracked open, untracked notice
- [x] 7 new tests (115 total)

### Weeks 15–17 deliverables
- [x] `gap_analyzer.py`: distinct-outfit combination graph per occasion (same composition rules as the engine, clash-aware colours); for every (garment type × occasion) simulates one purchase and counts distinct new outfits; weights by the user's 90-day occasion history, budget (typical price bands added to the taxonomy) and regional style; occasion-aware colour suggestions; count-based plain-language rationale ("You have 6 tops for Casual but only 1 bottom — …")
- [x] `gap_service.py`: weekly cache (Redis `gap:{user_id}` or in-process), invalidated when the wardrobe grows by 3+ garments or on delete; budget requests bypass cache; `most_versatile` pieces
- [x] `GET /commerce/gap-report?budget=&refresh=` (Plus gate → 402 locked preview)
- [x] Monday 08:00 IST `pehno.weekly_gap_report` for Plus/Pro users with push + dedupe
- [x] Mobile: GapReportScreen (budget chips/custom, stats, ranked gap cards, locked ghost preview for free), GapItemScreen (colours, fabrics, occasions, price band; affiliate slot for weeks 18–19), "What's missing?" entry on WardrobeHome, `commerce/gap-report` deep link
- [x] 12 new tests (108 total); verified live

### Weeks 13–14 deliverables
- [x] `entitlements.py`: plans (Free / Plus ₹199 / Pro ₹399), feature→tier map, free garment limit (30), nudge threshold (20); 402 `PaywallError` with `{message, feature, required_tier, upgrade_path}`; `/users/me.entitlements`
- [x] Gates: free garment limit on upload; festival curated looks + Navratri wardrobe matches are Plus (calendar, dress code and colour sequence stay free — locked, not hidden)
- [x] Billing: `subscriptions` + `billing_events` tables; `RazorpayProvider` (Subscriptions REST API, hosted checkout URL, HMAC webhook verification) and `MockProvider`; `/billing/plans`, `/billing/subscription`, `/billing/subscribe`, `/billing/cancel` (at period end), `/billing/webhook/razorpay` (idempotent by event id), `/billing/dev/activate`
- [x] Daily reconcile task (02:00 IST) downgrades lapsed subscriptions (3-day renewal grace for active ones)
- [x] Mobile: SubscriptionScreen (compare table, current plan, hosted checkout, pending-payment confirm, cancel), `LockedFeature` + `GhostLooks`, paywall-aware `ApiError`, 20-item / at-limit nudge on WardrobeHome, 402 handling on upload, locked states on FestivalDetail and NavratriTracker, Settings → Subscription
- [x] 10 new tests (96 total); verified live

## Phase 3 — Platform (Weeks 29–52)

| Block | Status | Notes |
|---|---|---|
| Weeks 29–32 — Social OOTD layer | ✅ (flag off) | `SOCIAL_ENABLED=false` by default per the plan's warning; flip when wardrobe data quality is high. |
| Weeks 33–37 — Stylist marketplace | ✅ | 20% commission, Razorpay Payment Links (mock locally), admin verification, scoped wardrobe access |
| Weeks 38–41 — Travel packing planner | ✅ | Capsule solver over the user's wardrobe; 20 destinations with local notes; hill-station climate offsets; gaps → affiliate links |
| Weeks 42–45 — Male wardrobe support | ✅ | 7 men's garment types, gender-scoped classification/gaps/links, men's occasion picks, fit layer for male + female builds |
| Weeks 46–48 — Brand partnership layer | ⬜ | Schema scaffold exists |
| Weeks 49–52 — Tier 2 expansion | ⬜ | Tier-2 cities already in cities.json; Hindi UI pending |

### Weeks 29–32 deliverables
- [x] Share cards: 1080×1350 Pillow render (collage, per-item type/fabric tags, occasion/festival header, PEHNO watermark, city) stored via the storage backend
- [x] Privacy model: `is_public` only after an explicit share; unshare hides card, page and feed entry; `social_sharing_enabled` opt-in pref
- [x] `/social/share-card/{id}` (POST/DELETE), `/social/feed/city` (viewer's city or `?city=`, newest first, 50), `/social/like/{id}` (POST/DELETE, idempotent), `/social/preferences`; public `/s/{slug}` page with Open Graph tags + `/s/{slug}/card.jpg` so WhatsApp/Instagram unfurl the card
- [x] City aesthetics in `cities.json` (Mumbai minimal, Delhi maximalist, …); share state on every outfit response; `entitlements.flags.social`
- [x] Mobile: share action on outfit cards, ShareOutfitScreen (card preview, native share sheet, copy link, stop sharing), OOTDFeedScreen (city feed, likes, tap-to-identify pieces); all hidden unless the flag is on
- [x] 4 new tests (140 total)

### Weeks 33–37 deliverables
- [x] Stylist profiles on `users` (`is_stylist`, `stylist_verified`, bio, specialties, price, portfolio, applied_at); `stylist_bookings` + `stylist_reviews` tables (migration `8650b05784cb`)
- [x] Apply → admin verify: `POST /stylists/apply` (re-submittable), `GET /stylists/me`; admin `GET /admin/stylists?pending`, `POST /admin/stylists/{id}/verify`, `GET /admin/stylists/bookings` (GMV + commission); admin dashboard **Stylists** page (verify/unlist, 30-day numbers)
- [x] Browse: `GET /stylists` (verified only, `city`/`specialty` filters, rating-sorted, per-viewer quote), `GET /stylists/{id}` (profile, portfolio, session types, last 20 reviews), `GET /stylists/specialties`
- [x] Bookings: `POST /stylists/book` (≥2 h ahead, 60-min slot clash → 409, no self-booking) creates a pending booking + provider **payment link**; `paid` webhook (`reference_id` = booking id) confirms — `BillingProvider.create_payment_link` on Razorpay (`/v1/payment_links`) and mock; `POST …/dev/pay` locally
- [x] Money: stylist sets price; Pro gets `PRO_STYLIST_DISCOUNT_RATE` (10%); platform keeps `STYLIST_COMMISSION_RATE` (20%) of the paid amount; stylists see commission + payout, clients don't
- [x] Lifecycle: cancel (either side; paid refunds manual for now), complete (stylist, confirmed only), review (client, once, after completion) → rating/count on profile and listing
- [x] Scoped wardrobe access `GET /stylists/my-wardrobe-access/{booking}`: stylist only, **only while confirmed**, returns first name + city + classified garments — never phone/email
- [x] Mobile: StylistList (specialty filter, Pro price), StylistProfile, BookSession (type/day/slot/notes → payment page or dev simulate), MyBookings (pay/cancel/review), Settings → StylistApply, IncomingBookings (payout, open client wardrobe, mark complete), ClientWardrobe (grid + brief); "Book a stylist" banner on DailyLook
- [x] 4 new tests (144 total); verified live

### Weeks 38–41 deliverables
- [x] `packages/ai/data/destinations.json`: 20 destination clusters (Jaipur/Udaipur/Jodhpur, Goa, Bengaluru, Kochi/Kerala, Manali/Shimla, Leh, Darjeeling/Sikkim, Ooty/Munnar/Coorg, Varanasi, Agra, Rishikesh, Amritsar, Hyderabad, Kolkata, Chennai/Pondicherry, Andaman, Ahmedabad/Kutch, Lucknow, Delhi, Mumbai) with vibe, cultural notes, modesty/packing tips, local palette, default activities and a `temp_offset_c` for hill stations; any other city still plans on regional climatology
- [x] `travel_planner.py`: slots = one per day (day-type activities cycled) + one evening per event activity; candidates via the outfit engine per slot with a destination-palette nudge; **cover** (greedy weighted set cover, hardest slot first) → **expand** (spend leftover budget only on pieces that unlock ≥2 new looks) → **assign** (variety across days); reports distinct looks the capsule makes (26-piece test wardrobe: Jaipur wedding trip 15 → 29 looks, Bengaluru offsite 12 → 46)
- [x] Gaps: for each undressed slot, the taxonomy piece that unlocks the most looks (tie → cheaper), palette-aware colour, reuses the gap-report `GapOut` shape so the mobile GapItem screen + affiliate links work unchanged; cold-destination layer nudge
- [x] `POST /travel/packing-list` (Plus, saved as `travel_plans`), `GET /travel/plans`, `GET|DELETE /travel/plans/{id}`, `GET /travel/destinations` (migration `c055480640d6`)
- [x] Mobile: TravelHome (saved trips, locked state), TravelPlanner (destination chips + free text, dates, activities, item budget), TravelPlan (pieces → looks hero, destination notes, day-by-day weather, capsule grid with wear counts, per-slot looks, gaps → GapItem); "Trip packing" link on DailyLook
- [x] 7 new tests (151 total); verified live

### Weeks 42–45 deliverables
- [x] Taxonomy: +sherwani, kurta_pyjama, bandhgala, nehru_jacket, dhoti, pyjama, pathani_suit (roles, fabrics, occasions, prices); `gender` on every type (kurta/churidar/indo_western unisex); men's picks added to mehendi/sangeet/haldi/baraat/reception `garment_preference`
- [x] Gender scoping: `knowledge.garment_types_for(gender)`; classifier restricts + renormalises type predictions to the user's taxonomy (both photo upload and scan mode); gap report, travel gaps and affiliate search queries ("… men"/"… women") follow the user's gender, inferred from the wardrobe for "other"
- [x] Occasion logic for men: engine composes kurta + pyjama/churidar/dhoti + Nehru jacket, sherwani/bandhgala as full looks; baraat → sherwani via tags + preference bonus
- [x] Fit guidance: `fit_guidance.json` (women: petite/regular/tall/plus; men: slim/athletic/regular/tall/broad/plus) with silhouette, prefer/avoid types and tips; new engine layer (`W_FIT_PREFER/AVOID`) + rationale; `BodyType` enum extended; `GET /meta/body-types?gender=`; garment-type options carry `gender`
- [x] Relabelling a garment's type/fabric with no tags now seeds occasions/seasons from the knowledge base
- [x] Zero-shot prompts for the men's classes; training/eval pick the classes up from the taxonomy (data collection still needed — see `packages/ai/README.md`)
- [x] Mobile: onboarding body-type step driven by `/meta/body-types` for the chosen gender (with fit tips); garment-type chips filtered by gender
- [x] 9 new tests (160 total)
