import { api } from './api';
import type { SendOtpResponse, TokenResponse } from './types';

export const authApi = {
  sendOtp: (phone: string) =>
    api.post<SendOtpResponse>('/auth/send-otp', { phone }).then((r) => r.data),
  verifyOtp: (phone: string, otp: string) =>
    api.post<TokenResponse>('/auth/verify-otp', { phone, otp }).then((r) => r.data),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refresh_token: refreshToken }).then(() => undefined),
};
