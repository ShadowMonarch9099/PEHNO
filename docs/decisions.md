# Architecture Decisions

Short records of choices that differ from, or aren't covered by, the build plan.

## Local database
**Context.** The plan targets Supabase (Postgres). Supabase isn't available during the rebuild.
**Decision.** Default `DATABASE_URL` is a local SQLite file (`aiosqlite`); tests use in-memory SQLite. Models use dialect-portable types (`GUID` → native UUID on Postgres / CHAR(36) elsewhere; `JSONColumn` → JSONB on Postgres / JSON elsewhere; string-backed enums). Alembic runs in batch mode on SQLite.
**Consequence.** Switching to Supabase is a one-line env change plus `alembic upgrade head`. Array-containment filters (e.g. "garments tagged `pooja`") need a small dialect-aware helper rather than Postgres `@>` — added with the wardrobe router.

## Image storage behind an interface
**Decision.** `app/services/storage` exposes `put/delete/url_for`. `LocalStorage` writes under `LOCAL_MEDIA_DIR` and the API serves it at `/media`. `SupabaseStorage` talks to the Storage REST API. Selected by `STORAGE_BACKEND`.

## OTP delivery behind an interface
**Decision.** `app/services/otp` has `ConsoleOtpProvider` (logs the code; API echoes it as `dev_otp` when `DEBUG`) and `Msg91OtpProvider`. `OTP_PROVIDER` selects. Only an HMAC of the code is stored; 5 attempts; 10-minute expiry; single use; 5 sends/hour/phone.

## Refresh-token rotation
**Decision.** Refresh tokens carry a `jti` recorded in `refresh_tokens`. Every refresh revokes the used token and issues a new pair; logout revokes; `logout-all` revokes every device. Access tokens are short-lived (60 min) and stateless.

## Rate limiting
**Decision.** In-process sliding window (`app/core/rate_limit.py`). Sufficient for one API instance; swap the store for Redis when scaling out — the call sites don't change.

## Web prototype (`frontend/`)
**Decision.** The Vite/React web prototype exported from Google AI Studio stays in the repo as a design reference only. It is not part of the plan (mobile-first) and is not wired to the API. Its palette was already ported into `apps/mobile/src/theme`.
