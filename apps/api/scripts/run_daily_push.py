"""Run the scheduled jobs once, now (local testing without Celery beat).

    python scripts/run_daily_push.py            # 07:30 daily look push
    python scripts/run_daily_push.py festivals  # 09:00 festival alerts
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.observability import setup_logging  # noqa: E402
from app.tasks.daily_outfit_push import push_daily_outfits  # noqa: E402
from app.tasks.festival_alert import send_festival_alerts  # noqa: E402

if __name__ == "__main__":
    setup_logging()
    job = send_festival_alerts if "festivals" in sys.argv[1:] else push_daily_outfits
    print(asyncio.run(job()))
