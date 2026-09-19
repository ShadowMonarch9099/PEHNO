"""
Mock provider for local dev/tests: no checkout page; POST /billing/dev/activate
(DEBUG only) simulates the provider's "activated" webhook.
"""
import hmac
import uuid
from datetime import UTC, datetime, timedelta
from hashlib import sha256

from app.core.config import settings
from app.services.billing import BillingProvider, CheckoutSession, ProviderEvent


class MockProvider(BillingProvider):
    name = "mock"

    async def create_subscription(self, *, plan: str, user_id: str, phone: str) -> CheckoutSession:
        return CheckoutSession(
            provider_subscription_id=f"mock_sub_{uuid.uuid4().hex[:12]}", checkout_url=None
        )

    async def cancel_subscription(
        self, provider_subscription_id: str, *, at_period_end: bool
    ) -> None:
        return None

    def verify_webhook(self, body: bytes, signature: str | None) -> bool:
        # Same scheme as Razorpay so the webhook route is exercised end-to-end in tests.
        if not signature:
            return False
        expected = hmac.new(settings.JWT_SECRET.encode(), body, sha256).hexdigest()
        return hmac.compare_digest(expected, signature)

    def parse_event(self, payload: dict) -> ProviderEvent:
        end = payload.get("current_period_end")
        return ProviderEvent(
            event_id=payload.get("id") or uuid.uuid4().hex,
            event_type=payload.get("event", "other"),
            provider_subscription_id=payload.get("subscription_id"),
            current_period_end=datetime.fromisoformat(end)
            if end
            else datetime.now(UTC) + timedelta(days=30),
            raw=payload,
        )
