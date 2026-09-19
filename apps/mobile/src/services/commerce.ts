import { api } from './api';
import type { AffiliateLinks, GapReport, ProductCard } from './types';

export const commerceApi = {
  gapReport: (opts: { budget?: number; refresh?: boolean } = {}) =>
    api.get<GapReport>('/commerce/gap-report', { params: opts }).then((r) => r.data),
  affiliateLinks: (params: { gap_type: string; color?: string; fabric?: string; budget?: number; platform?: string }) =>
    api.get<AffiliateLinks>('/commerce/affiliate-links', { params }).then((r) => r.data),
  /** Log the click; returns the tracked URL to open. */
  click: (card: ProductCard, gapType?: string) =>
    api
      .post<{ click_id: string; affiliate_url: string }>('/commerce/affiliate-click', {
        platform: card.platform,
        product_url: card.product_url,
        gap_type: gapType,
      })
      .then((r) => r.data),
};
