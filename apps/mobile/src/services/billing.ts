import { api } from './api';
import type { BillingState, Plan, Subscription, SubscriptionTier } from './types';

export const billingApi = {
  plans: () => api.get<Plan[]>('/billing/plans').then((r) => r.data),
  state: () => api.get<BillingState>('/billing/subscription').then((r) => r.data),
  subscribe: (plan: Exclude<SubscriptionTier, 'free'>) =>
    api.post<Subscription>('/billing/subscribe', { plan }).then((r) => r.data),
  cancel: () => api.post<Subscription>('/billing/cancel').then((r) => r.data),
  /** Dev/mock provider only: simulate the provider confirming payment. */
  devActivate: () => api.post<Subscription>('/billing/dev/activate').then((r) => r.data),
};
