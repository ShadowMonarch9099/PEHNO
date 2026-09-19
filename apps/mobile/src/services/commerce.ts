import { api } from './api';
import type { AffiliateLinks, GapReport, ProductCard, ScanResult } from './types';
import type { LocalPhoto } from './wardrobe';

export const commerceApi = {
  scan: (photo: LocalPhoto) => {
    const form = new FormData();
    form.append('file', { uri: photo.uri, name: photo.fileName ?? 'scan.jpg', type: photo.mimeType ?? 'image/jpeg' } as unknown as Blob);
    return api
      .post<ScanResult>('/commerce/scan', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60_000 })
      .then((r) => r.data);
  },
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
