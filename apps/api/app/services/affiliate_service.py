"""
Affiliate commerce: product cards + trackable deep links per platform.

Reality: Myntra, Ajio, Nykaa Fashion and Meesho expose no public product-search
API; affiliate traffic goes through a network (Cuelinks / EarnKaro / vCommission)
that wraps a target URL and reports conversions via a postback carrying our
`subid`. So today a "product card" is a curated *search* on the platform
(colour + garment + fabric + budget), and `ProductSource` is the seam where a
partner catalogue API plugs in when one is approved.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from urllib.parse import quote, urlencode

from app import knowledge
from app.core.config import settings
from app.models.commerce import AffiliatePlatform

PLATFORM_LABELS = {
    AffiliatePlatform.myntra: "Myntra",
    AffiliatePlatform.ajio: "AJIO",
    AffiliatePlatform.nykaa: "Nykaa Fashion",
    AffiliatePlatform.meesho: "Meesho",
}

# Platform search URL patterns (verified public URL shapes; no API keys involved).
_SEARCH = {
    AffiliatePlatform.myntra: lambda q: f"https://www.myntra.com/{quote(q.replace(' ', '-'))}?rawQuery={quote(q)}",
    AffiliatePlatform.ajio: lambda q: f"https://www.ajio.com/search/?text={quote(q)}",
    AffiliatePlatform.nykaa: lambda q: f"https://www.nykaafashion.com/search/result/?q={quote(q)}",
    AffiliatePlatform.meesho: lambda q: f"https://www.meesho.com/search?q={quote(q)}",
}

# Rough positioning used to order platforms by budget: Meesho for value, Nykaa/Ajio mid–premium.
_BUDGET_ORDER = {
    "value": [
        AffiliatePlatform.meesho,
        AffiliatePlatform.myntra,
        AffiliatePlatform.ajio,
        AffiliatePlatform.nykaa,
    ],
    "mid": [
        AffiliatePlatform.myntra,
        AffiliatePlatform.ajio,
        AffiliatePlatform.nykaa,
        AffiliatePlatform.meesho,
    ],
    "premium": [
        AffiliatePlatform.nykaa,
        AffiliatePlatform.ajio,
        AffiliatePlatform.myntra,
        AffiliatePlatform.meesho,
    ],
}


@dataclass
class ProductCard:
    platform: AffiliatePlatform
    platform_label: str
    name: str
    query: str
    product_url: str  # un-wrapped target
    price_min_inr: int | None
    price_max_inr: int | None
    image_url: str | None = None
    is_search: bool = True  # False once a real catalogue item backs the card


class ProductSource(ABC):
    @abstractmethod
    def cards(
        self,
        *,
        gap_type: str,
        color: str | None,
        fabric: str | None,
        budget_inr: int | None,
        platforms: list[AffiliatePlatform],
        gender: str | None = None,
    ) -> list[ProductCard]:
        ...


class SearchLinkSource(ProductSource):
    """Default: one curated search per platform."""

    def cards(self, *, gap_type, color, fabric, budget_inr, platforms, gender=None):
        tax = {g["slug"]: g for g in knowledge.garment_types()}
        entry = tax.get(
            gap_type,
            {"label": gap_type.replace("_", " ").title(), "typical_price_inr": [None, None]},
        )
        lo, hi = entry.get("typical_price_inr", [None, None])
        words = [
            w
            for w in (color, fabric.replace("_", " ") if fabric else None, entry["label"].lower())
            if w
        ]
        audience = {"male": "men", "female": "women"}.get(gender or "", "")
        if tax.get(gap_type, {}).get("gender") == "men":
            audience = "men"
        elif tax.get(gap_type, {}).get("gender") == "women":
            audience = "women"
        query = (" ".join(words) + f" {audience}").strip()
        name = " ".join(w.capitalize() for w in words)
        out = []
        for p in platforms:
            out.append(
                ProductCard(
                    platform=p,
                    platform_label=PLATFORM_LABELS[p],
                    name=f"{name} on {PLATFORM_LABELS[p]}",
                    query=query,
                    product_url=_SEARCH[p](query),
                    price_min_inr=lo,
                    price_max_inr=min(hi, budget_inr) if (hi and budget_inr) else hi,
                )
            )
        return out


def platforms_for_budget(budget_inr: int | None) -> list[AffiliatePlatform]:
    if budget_inr is None:
        return _BUDGET_ORDER["mid"]
    if budget_inr <= 800:
        return _BUDGET_ORDER["value"]
    if budget_inr >= 4000:
        return _BUDGET_ORDER["premium"]
    return _BUDGET_ORDER["mid"]


def _platform_id(platform: AffiliatePlatform) -> str:
    return {
        AffiliatePlatform.myntra: settings.MYNTRA_AFFILIATE_ID,
        AffiliatePlatform.ajio: settings.AJIO_AFFILIATE_ID,
        AffiliatePlatform.nykaa: settings.NYKAA_AFFILIATE_ID,
        AffiliatePlatform.meesho: settings.MEESHO_AFFILIATE_ID,
    }[platform]


def affiliate_url(product_url: str, platform: AffiliatePlatform, subid: str) -> str:
    """
    Wrap a target URL for tracking. With a network template: the network's deep link
    carrying our subid. Without: the plain URL tagged with utm + subid so clicks are
    still attributable in platform analytics once IDs exist.
    """
    if settings.AFFILIATE_NETWORK_TEMPLATE:
        return settings.AFFILIATE_NETWORK_TEMPLATE.format(
            url=quote(product_url, safe=""),
            subid=subid,
            cid=settings.AFFILIATE_NETWORK_ID or _platform_id(platform),
        )
    sep = "&" if "?" in product_url else "?"
    tag = {"utm_source": "pehno", "utm_medium": "affiliate", "subid": subid}
    pid = _platform_id(platform)
    if pid:
        tag["aff_id"] = pid
    return f"{product_url}{sep}{urlencode(tag)}"


def get_product_source() -> ProductSource:
    return SearchLinkSource()
