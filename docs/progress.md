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
| Week 12 — Polish & launch | ⬜ | |

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

## Phase 2 — Commerce (Weeks 13–28)
⬜ Not started.

## Phase 3 — Platform (Weeks 29–52)
⬜ Not started.
