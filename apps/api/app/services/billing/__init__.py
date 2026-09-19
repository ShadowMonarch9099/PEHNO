"""
Subscription billing providers. Razorpay Subscriptions when configured; a mock
that activates via a dev endpoint otherwise. Both implement BillingProvider.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache

from app.core.config import settings


@dataclass
class CheckoutSession:
    provider_subscription_id: str
    checkout_url: str | None  # hosted checkout; None for mock


@dataclass
class ProviderEvent:
    """Normalised webhook event."""

    event_id: str
    event_type: str  # activated | charged | cancelled | halted | completed | other
    provider_subscription_id: str | None
    current_period_end: datetime | None
    raw: dict


class BillingProvider(ABC):
    name = "base"

    @abstractmethod
    async def create_subscription(self, *, plan: str, user_id: str, phone: str) -> CheckoutSession:
        ...

    @abstractmethod
    async def cancel_subscription(
        self, provider_subscription_id: str, *, at_period_end: bool
    ) -> None:
        ...

    @abstractmethod
    def verify_webhook(self, body: bytes, signature: str | None) -> bool:
        ...

    @abstractmethod
    def parse_event(self, payload: dict) -> ProviderEvent:
        ...


@lru_cache
def get_billing_provider() -> BillingProvider:
    if settings.BILLING_PROVIDER == "razorpay":
        from app.services.billing.razorpay import RazorpayProvider

        return RazorpayProvider()
    from app.services.billing.mock import MockProvider

    return MockProvider()
