import { api } from './api';
import type { Booking, ClientWardrobe, SessionType, Stylist, StylistApplication, StylistProfile, StylistReview } from './types';

export const stylistsApi = {
  list: (params?: { city?: string; specialty?: string }) => api.get<Stylist[]>('/stylists', { params }).then((r) => r.data),
  specialties: () => api.get<string[]>('/stylists/specialties').then((r) => r.data),
  get: (id: string) => api.get<Stylist>(`/stylists/${id}`).then((r) => r.data),
  me: () => api.get<StylistProfile>('/stylists/me').then((r) => r.data),
  apply: (body: StylistApplication) => api.post<StylistProfile>('/stylists/apply', body).then((r) => r.data),
  book: (body: { stylist_id: string; session_type: SessionType; scheduled_at: string; notes?: string }) =>
    api.post<Booking>('/stylists/book', body).then((r) => r.data),
  myBookings: () => api.get<Booking[]>('/stylists/bookings/my').then((r) => r.data),
  incoming: () => api.get<Booking[]>('/stylists/bookings/incoming').then((r) => r.data),
  booking: (id: string) => api.get<Booking>(`/stylists/bookings/${id}`).then((r) => r.data),
  cancel: (id: string) => api.post<Booking>(`/stylists/bookings/${id}/cancel`).then((r) => r.data),
  complete: (id: string) => api.post<Booking>(`/stylists/bookings/${id}/complete`).then((r) => r.data),
  review: (id: string, body: { rating: number; comment?: string }) =>
    api.post<StylistReview>(`/stylists/bookings/${id}/review`, body).then((r) => r.data),
  clientWardrobe: (bookingId: string) => api.get<ClientWardrobe>(`/stylists/my-wardrobe-access/${bookingId}`).then((r) => r.data),
  /** Local dev only (mock billing): simulates the paid webhook. */
  devPay: (id: string) => api.post<Booking>(`/stylists/bookings/${id}/dev/pay`).then((r) => r.data),
};
