"""
Plans, features and gating — the single source of truth for what each tier gets.

Rule (build plan): gated features are always *shown* as locked, never hidden.
Endpoints therefore raise 402 with a structured body the client turns into an
upgrade prompt, and /users/me exposes the full entitlement map.
"""
from dataclasses import dataclass

from fastapi import HTTPException, status

from app.core.config import settings
from app.models.user import SubscriptionTier, User

TIER_ORDER = {SubscriptionTier.free: 0, SubscriptionTier.plus: 1, SubscriptionTier.pro: 2}


@dataclass(frozen=True)
class Plan:
    tier: SubscriptionTier
    name: str
    price_inr_month: int
    tagline: str
    features: tuple[str, ...]  # feature keys unlocked at this tier (cumulative via TIER_ORDER)


# Feature key → minimum tier. Everything not listed is free.
FEATURE_TIERS: dict[str, SubscriptionTier] = {
    "festival_looks": SubscriptionTier.plus,  # curated looks + Navratri wardrobe matches
    "fabric_care": SubscriptionTier.plus,  # care profiles + care reminders
    "gap_report": SubscriptionTier.plus,  # weeks 15–17
    "travel_packing": SubscriptionTier.plus,  # phase 3
    "scan_mode": SubscriptionTier.pro,  # weeks 22–24
    "priority_classification": SubscriptionTier.pro,
    "stylist_discounts": SubscriptionTier.pro,  # phase 3
}

FEATURE_LABELS: dict[str, str] = {
    "festival_looks": "Festival looks curated from your wardrobe",
    "fabric_care": "Fabric care profiles & reminders",
    "gap_report": "Wardrobe gap analysis",
    "travel_packing": "Travel packing planner",
    "scan_mode": "Shopping scan mode",
    "priority_classification": "Priority AI classification",
    "stylist_discounts": "Stylist session discounts",
}

PLANS: dict[SubscriptionTier, Plan] = {
    SubscriptionTier.free: Plan(
        SubscriptionTier.free,
        "Free",
        0,
        "Digitise your wardrobe and get a daily look.",
        ("wardrobe_upload", "daily_outfit", "festival_alerts"),
    ),
    SubscriptionTier.plus: Plan(
        SubscriptionTier.plus,
        "Plus",
        settings.PLUS_PRICE_INR,
        "Festival intelligence, fabric care and unlimited wardrobe.",
        ("unlimited_wardrobe", "festival_looks", "fabric_care", "gap_report", "travel_packing"),
    ),
    SubscriptionTier.pro: Plan(
        SubscriptionTier.pro,
        "Pro",
        settings.PRO_PRICE_INR,
        "Everything in Plus, plus scan mode and priority AI.",
        ("scan_mode", "priority_classification", "stylist_discounts"),
    ),
}


def has_feature(user: User, feature: str) -> bool:
    required = FEATURE_TIERS.get(feature, SubscriptionTier.free)
    return TIER_ORDER[user.subscription_tier] >= TIER_ORDER[required]


def garment_limit(user: User) -> int | None:
    """None = unlimited."""
    return settings.FREE_GARMENT_LIMIT if user.subscription_tier == SubscriptionTier.free else None


class PaywallError(HTTPException):
    """402 with a body the client renders as a locked feature + upgrade prompt."""

    def __init__(self, feature: str, *, message: str | None = None) -> None:
        required = FEATURE_TIERS.get(feature, SubscriptionTier.plus)
        super().__init__(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "message": message
                or f"{FEATURE_LABELS.get(feature, feature)} is a {PLANS[required].name} feature.",
                "feature": feature,
                "required_tier": required.value,
                "upgrade_path": "/billing/plans",
            },
        )


def require_feature(user: User, feature: str) -> None:
    if not has_feature(user, feature):
        raise PaywallError(feature)


def entitlements_for(user: User, garment_count: int) -> dict:
    """What the client needs to render locks, limits and nudges."""
    limit = garment_limit(user)
    return {
        "tier": user.subscription_tier.value,
        "expires_at": user.subscription_expires_at,
        "garment_limit": limit,
        "garments_used": garment_count,
        "features": {
            key: {
                "label": FEATURE_LABELS[key],
                "unlocked": has_feature(user, key),
                "required_tier": tier.value,
            }
            for key, tier in FEATURE_TIERS.items()
        },
        # Natural inflection points for an upgrade nudge (client decides presentation).
        "nudge": (
            "plus_wardrobe_20"
            if user.subscription_tier == SubscriptionTier.free
            and garment_count >= settings.NUDGE_AT_GARMENTS
            else None
        ),
    }
