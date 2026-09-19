"""Run the morning push job once, now (for local testing without Celery beat)."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.observability import setup_logging  # noqa: E402
from app.tasks.daily_outfit_push import push_daily_outfits  # noqa: E402

if __name__ == "__main__":
    setup_logging()
    print(asyncio.run(push_daily_outfits()))
