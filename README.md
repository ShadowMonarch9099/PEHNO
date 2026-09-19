<div align="center">

# PEHNO — पहनो
### AI Wardrobe Intelligence for India

*Never wonder what to wear again.*

</div>

PEHNO digitises an Indian wardrobe (ethnic, fusion, western), classifies every garment with vision AI, and recommends outfits using live weather, Indian occasions, the festival calendar, fabric–weather rules and personal style.

- **Plan:** [docs/build-plan.md](docs/build-plan.md) (52 weeks, 3 phases) · **Status:** [docs/progress.md](docs/progress.md) · **Decisions:** [docs/decisions.md](docs/decisions.md) · **Launch:** [docs/launch-checklist.md](docs/launch-checklist.md)

## Repository

```
apps/
  api/        FastAPI backend (Python 3.11, SQLAlchemy 2 async, Alembic)
  mobile/     React Native app (Expo SDK 52, TypeScript, Zustand, React Navigation)
packages/
  ai/data/    Indian knowledge base (festivals, fabric×weather, occasions, garment taxonomy) — core IP
  types/      Shared TypeScript types
  config/     Shared ESLint / Prettier
infra/        docker-compose (Postgres + Redis + API), nginx
docs/         Build plan, progress, architecture decisions
frontend/     Web design prototype (reference only — not wired to the API)
```

## Quick start (no external services needed)

### API

```bash
cd apps/api
python -m venv venv && venv/Scripts/activate        # Windows; use source venv/bin/activate on macOS/Linux
pip install -r requirements-dev.txt
pip install -r requirements-ml.txt   # optional: CLIP zero-shot classifier (~2 GB); skip and set CLASSIFIER_BACKEND=rules
cp .env.example .env                                 # defaults: SQLite, console OTP, local media
alembic upgrade head
uvicorn main:app --reload
```

- Swagger: http://localhost:8000/docs
- Login flow: `POST /auth/send-otp {"phone":"9876543210"}` → the response includes `dev_otp` (dev only) → `POST /auth/verify-otp`.

### Mobile

```bash
cd apps/mobile
cp .env.example .env    # set EXPO_PUBLIC_API_URL to your machine's LAN IP for a physical device
npx expo start
```

### Checks

```bash
cd apps/api && ruff check . && ruff format --check . && pytest -q
npx tsc --noEmit -p apps/mobile
```

## Switching to hosted services

| Setting | Local default | Hosted |
|---|---|---|
| `DATABASE_URL` | `sqlite+aiosqlite:///./pehno.db` | `postgresql+asyncpg://…supabase.co:5432/postgres` |
| `STORAGE_BACKEND` | `local` (served at `/media`) | `supabase` (+ `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`) |
| `OTP_PROVIDER` | `console` | `msg91` (+ `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`) |
| `OPENWEATHER_API_KEY` | empty (monthly climatology per city) | live weather |
| `FIREBASE_SERVICE_ACCOUNT` | empty (console notifier) | FCM push |
| `CELERY_BROKER_URL` | empty (in-process jobs) | Redis; run `celery -A app.tasks worker` and `celery -A app.tasks beat` |
| `POSTHOG_API_KEY` | empty (events logged) | PostHog analytics |
| `SENTRY_DSN` | empty (disabled) | your DSN |

Full-stack locally with Docker: `docker compose -f infra/docker-compose.yml up`.

## API (current)

```
GET  /health
POST /auth/send-otp        POST /auth/verify-otp     POST /auth/refresh
POST /auth/logout          POST /auth/logout-all
GET  /users/me             PUT  /users/me            GET  /users/me/stats
POST /wardrobe/upload      GET  /wardrobe            GET  /wardrobe/{id}
PUT  /wardrobe/{id}        DELETE /wardrobe/{id}     POST /wardrobe/{id}/wear
POST /wardrobe/{id}/confirm                          POST /wardrobe/{id}/reclassify
GET  /outfits/daily        POST /outfits/generate    GET  /outfits/history     GET /outfits/saved
POST /outfits/{id}/feedback  POST|DELETE /outfits/{id}/save  POST /outfits/{id}/wear
GET  /festivals/upcoming   GET  /festivals/{slug}    GET  /festivals/navratri/today
GET  /meta/wardrobe-options                          GET  /meta/cities
POST /notifications/{id}/opened
GET  /media/{key}?exp&sig  (local storage backend; signed URLs)
```

## Contributing

- Branch from `rebuild/phase-1` (`feat/<week-block>-<topic>`); conventional commits.
- Every API change ships with tests; every schema change ships with an Alembic migration.
- `packages/ai/data/` is versioned knowledge — change it deliberately and note why.

MIT © 2025 PEHNO Technologies Pvt. Ltd.
