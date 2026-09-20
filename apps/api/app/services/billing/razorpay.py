"""
Razorpay Subscriptions via the REST API (Basic auth key_id:key_secret).
Docs: https://razorpay.com/docs/api/payments/subscriptions/
Plans (plan_xxx) are created once in the dashboard and referenced by env.
"""
import hmac
from datetime import UTC, datetime
from hashlib import sha256

import httpx

from app.core.config import settings
from app.services.billing import BillingProvider, CheckoutSession, PaymentLink, ProviderEvent

API = "https://api.razorpay.com/v1"

_EVENT_MAP = {
    "subscription.activated": "activated",
    "subscription.charged": "charged",
    "subscription.cancelled": "cancelled",
    "subscription.halted": "halted",
    "subscription.completed": "completed",
    "subscription.paused": "halted",
    "subscription.resumed": "activated",
    "payment_link.paid": "paid",
}


class RazorpayProvider(BillingProvider):
    name = "razorpay"

    def __init__(self) -> None:
        if not (settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET):
            raise ValueError(
                "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required for BILLING_PROVIDER=razorpay"
            )
        self._auth = (settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        self._plans = {"plus": settings.RAZORPAY_PLAN_PLUS, "pro": settings.RAZORPAY_PLAN_PRO}

    async def create_subscription(self, *, plan: str, user_id: str, phone: str) -> CheckoutSession:
        plan_id = self._plans.get(plan)
        if not plan_id:
            raise ValueError(
                f"No Razorpay plan configured for '{plan}' (RAZORPAY_PLAN_{plan.upper()})"
            )
        async with httpx.AsyncClient(timeout=15, auth=self._auth) as client:
            r = await client.post(
                f"{API}/subscriptions",
                json={
                    "plan_id": plan_id,
                    "total_count": 120,  # monthly × 10 years; auto-renews until cancelled
                    "customer_notify": 1,
                    "notes": {"user_id": user_id, "phone": phone, "plan": plan},
                },
            )
            r.raise_for_status()
            d = r.json()
        return CheckoutSession(provider_subscription_id=d["id"], checkout_url=d.get("short_url"))

    async def cancel_subscription(
        self, provider_subscription_id: str, *, at_period_end: bool
    ) -> None:
        async with httpx.AsyncClient(timeout=15, auth=self._auth) as client:
            r = await client.post(
                f"{API}/subscriptions/{provider_subscription_id}/cancel",
                json={"cancel_at_cycle_end": 1 if at_period_end else 0},
            )
            r.raise_for_status()

    async def create_payment_link(
        self, *, amount_inr: float, description: str, reference_id: str, phone: str
    ) -> PaymentLink:
        async with httpx.AsyncClient(timeout=15, auth=self._auth) as client:
            r = await client.post(
                f"{API}/payment_links",
                json={
                    "amount": int(round(amount_inr * 100)),
                    "currency": "INR",
                    "description": description,
                    "reference_id": reference_id,
                    "customer": {"contact": phone},
                    "notify": {"sms": True},
                    "notes": {"reference_id": reference_id},
                },
            )
            r.raise_for_status()
            d = r.json()
        return PaymentLink(provider_payment_id=d["id"], url=d.get("short_url"))

    def verify_webhook(self, body: bytes, signature: str | None) -> bool:
        if not signature or not settings.RAZORPAY_WEBHOOK_SECRET:
            return False
        expected = hmac.new(settings.RAZORPAY_WEBHOOK_SECRET.encode(), body, sha256).hexdigest()
        return hmac.compare_digest(expected, signature)

    def parse_event(self, payload: dict) -> ProviderEvent:
        body = payload.get("payload", {})
        sub = body.get("subscription", {}).get("entity", {})
        link = body.get("payment_link", {}).get("entity", {})
        end = sub.get("current_end")
        ident = sub.get("id") or link.get("id")
        return ProviderEvent(
            event_id=payload.get("id")
            or f"{payload.get('event')}:{ident}:{payload.get('created_at')}",
            event_type=_EVENT_MAP.get(payload.get("event", ""), "other"),
            provider_subscription_id=sub.get("id"),
            current_period_end=datetime.fromtimestamp(end, tz=UTC) if end else None,
            raw=payload,
            reference_id=link.get("reference_id"),
            amount_inr=(link.get("amount_paid") or 0) / 100 if link else None,
        )
