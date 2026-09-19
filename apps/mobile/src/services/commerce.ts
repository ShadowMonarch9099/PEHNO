import { api } from './api';
import type { GapReport } from './types';

export const commerceApi = {
  gapReport: (opts: { budget?: number; refresh?: boolean } = {}) =>
    api.get<GapReport>('/commerce/gap-report', { params: opts }).then((r) => r.data),
};
