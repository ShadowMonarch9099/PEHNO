# MVP Launch Checklist (Week 12)

What the code already does is ticked. Unticked items need accounts, keys or people — the codebase is ready for each (the env var or file to provide is named).

## Infrastructure
- [x] API boots with zero external services (SQLite, local media, console OTP/push, climatology weather)
- [ ] Provision Postgres (Supabase) → set `DATABASE_URL`; run `alembic upgrade head`
- [ ] Supabase Storage bucket `garment-images` (private) → `STORAGE_BACKEND=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- [ ] Redis → `CELERY_BROKER_URL`; run `celery -A app.tasks worker` and `celery -A app.tasks beat` (see `infra/docker-compose.yml`)
- [ ] Railway project + `RAILWAY_TOKEN` secret → `.github/workflows/deploy.yml` becomes live
- [ ] Sentry project → `SENTRY_DSN`
- [ ] Production `.env`: `APP_ENV=production`, strong `JWT_SECRET` (≥32 chars), `DEBUG=false`, `PUBLIC_BASE_URL=https://api.pehno.in`, `ALLOWED_ORIGINS`
- [ ] `pip install -r requirements-ml.txt` on the API/worker image (or `CLASSIFIER_BACKEND=rules` until then)

## Integrations
- [ ] MSG91 account + approved OTP template → `OTP_PROVIDER=msg91`, `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`
- [ ] OpenWeatherMap key → `OPENWEATHER_API_KEY` (until then: monthly climatology per city)
- [ ] Firebase project: service-account JSON → `FIREBASE_SERVICE_ACCOUNT`; `apps/mobile/google-services.json` (Android) and APNs key (iOS) in EAS credentials
- [ ] PostHog project → `POSTHOG_API_KEY` (until then: events are logged server-side)
- [ ] Razorpay account: create monthly plans for Plus (₹199) and Pro (₹399) → `RAZORPAY_PLAN_PLUS/PRO`, key id/secret, webhook secret; point the webhook at `/billing/webhook/razorpay`; set `BILLING_PROVIDER=razorpay`

## Mobile release
- [ ] Expo account: `eas init` → replace `REPLACE_WITH_EAS_PROJECT_ID` in `apps/mobile/app.json`
- [ ] `eas build --profile preview` (internal APK for the beta cohort) → `eas build --profile production`
- [ ] Play Console app (`in.pehno.app`), internal testing track; App Store Connect app, TestFlight; replace `ascAppId` in `eas.json`
- [ ] Store listing: screenshots, privacy policy URL (photos are private; corrections are retained for model training — say so), data-safety form
- [ ] Reserve a week for review

## Data & model
- [ ] Collect a labelled eval set (≥30 phone photos per garment type) → `packages/ai/eval/evaluate.py`; record the baseline in `packages/ai/README.md`
- [ ] Decide zero-shot vs fine-tune from that number (85% gate); `train_vit.py` is ready
- [ ] Re-verify 2026/2027 lunar festival dates in `packages/ai/data/festivals.json`

## Beta cohort (100 users, Mumbai · Delhi · Bengaluru)
- [ ] Gap-report validation (plan weeks 15–17): show 10 beta users their report and ask whether the #1 gap is something they'd actually buy — tune `gap_analyzer` weights from that before promoting the feature
- [ ] Onboard via the OTP flow; confirm daily push arrives 07:30 IST
- [ ] Weekly: `python scripts/mvp_metrics.py --days 7` → 7-day return ≥ 60%, push open > 30%, classification acceptance > 80%
- [ ] Weekly: `python scripts/export_training_data.py` to bank corrections

## Bug-bash items fixed in this pass
- Local media now requires signed, expiring URLs (was public by path)
- Outfit history/saved pages load garments in one query (was N+1)
- Failed OTP attempts persist through the error response (lockout works)
- Festival looks judged against festival-date weather, not today's
