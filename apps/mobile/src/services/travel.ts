import { api } from './api';
import type { Destination, PackingRequest, TravelPlan, TravelPlanSummary } from './types';

export const travelApi = {
  destinations: () => api.get<Destination[]>('/travel/destinations').then((r) => r.data),
  plan: (body: PackingRequest) => api.post<TravelPlan>('/travel/packing-list', body).then((r) => r.data),
  plans: () => api.get<TravelPlanSummary[]>('/travel/plans').then((r) => r.data),
  get: (id: string) => api.get<TravelPlan>(`/travel/plans/${id}`).then((r) => r.data),
  remove: (id: string) => api.delete(`/travel/plans/${id}`).then(() => undefined),
};
