"""
MVP success-gate metrics (build plan, week 12), computed from the database:

  1. 7-day return rate: of users who completed a wardrobe upload (>= 1 garment)
     at least 7 days ago, the share who were active again within 7 days after
     their first upload.
  2. Push open rate: opened / sent for daily_outfit pushes.
  3. Classification acceptance: garments confirmed or edited without touching any
     AI label / all user-verified garments.

    venv/Scripts/python scripts/mvp_metrics.py [--days 30]

Gates: return >= 60%, open rate > 30%, acceptance > 80%.
"""
import argparse
import asyncio
import sys
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import func, select  # noqa: E402

from app.core.database import SessionLocal, utcnow  # noqa: E402
from app.models.feedback import ClassificationFeedback  # noqa: E402
from app.models.garment import Garment  # noqa: E402
from app.models.notification import NotificationLog  # noqa: E402
from app.models.outfit import Outfit  # noqa: E402
from app.models.user import User  # noqa: E402


def pct(n: float, d: float) -> str:
    return f"{100 * n / d:.1f}%" if d else "n/a"


async def main(days: int) -> None:
    since = utcnow() - timedelta(days=days)
    async with SessionLocal() as db:
        # ── 1. 7-day return after first upload ─────────────────────────────
        first_upload = (
            select(Garment.user_id, func.min(Garment.created_at).label("first"))
            .group_by(Garment.user_id)
            .subquery()
        )
        cohort = (
            await db.execute(
                select(first_upload).where(
                    first_upload.c.first <= utcnow() - timedelta(days=7),
                    first_upload.c.first >= since,
                )
            )
        ).all()
        returned = 0
        for user_id, first in cohort:
            window_start, window_end = first + timedelta(hours=12), first + timedelta(days=7)
            # any outfit interaction, wear log or later upload counts as "returned"
            later_outfits = await db.scalar(
                select(func.count(Outfit.id)).where(
                    Outfit.user_id == user_id, Outfit.created_at.between(window_start, window_end)
                )
            )
            later_garments = await db.scalar(
                select(func.count(Garment.id)).where(
                    Garment.user_id == user_id, Garment.created_at.between(window_start, window_end)
                )
            )
            user = await db.get(User, user_id)
            login_back = (
                user and user.last_login_at and window_start <= user.last_login_at <= window_end
            )
            if later_outfits or later_garments or login_back:
                returned += 1

        # ── 2. push open rate ──────────────────────────────────────────────
        sent = await db.scalar(
            select(func.count(NotificationLog.id)).where(
                NotificationLog.kind == "daily_outfit", NotificationLog.sent_at >= since
            )
        )
        opened = await db.scalar(
            select(func.count(NotificationLog.id)).where(
                NotificationLog.kind == "daily_outfit",
                NotificationLog.sent_at >= since,
                NotificationLog.opened_at.is_not(None),
            )
        )

        # ── 3. classification acceptance ───────────────────────────────────
        verified_ids = (
            (
                await db.execute(
                    select(Garment.id).where(
                        Garment.user_verified.is_(True),
                        Garment.created_at >= since,
                        Garment.ai_labels.is_not(None),
                    )
                )
            )
            .scalars()
            .all()
        )
        corrected_ids = (
            set(
                (
                    await db.execute(
                        select(ClassificationFeedback.garment_id).where(
                            ClassificationFeedback.garment_id.in_(verified_ids)
                        )
                    )
                )
                .scalars()
                .all()
            )
            if verified_ids
            else set()
        )
        accepted = len(verified_ids) - len(corrected_ids)

        total_users = await db.scalar(select(func.count(User.id)))
        onboarded = await db.scalar(
            select(func.count(User.id)).where(User.onboarding_complete.is_(True))
        )
        with_30 = await db.scalar(
            select(func.count()).select_from(
                select(Garment.user_id)
                .group_by(Garment.user_id)
                .having(func.count(Garment.id) >= 30)
                .subquery()
            )
        )

    print(f"Window: last {days} days\n")
    print(f"Users: {total_users} total | {onboarded} onboarded | {with_30} with 30+ garments\n")
    print(
        f"1. 7-day return after first upload : {pct(returned, len(cohort))}  ({returned}/{len(cohort)})   gate >= 60%"
    )
    print(
        f"2. Daily push open rate            : {pct(opened or 0, sent or 0)}  ({opened}/{sent})   gate > 30%"
    )
    print(
        f"3. Classification acceptance       : {pct(accepted, len(verified_ids))}  ({accepted}/{len(verified_ids)} verified without correction)   gate > 80%"
    )


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=30)
    asyncio.run(main(ap.parse_args().days))
