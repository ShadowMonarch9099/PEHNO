/**
 * NextAuth: Google sign-in restricted to ADMIN_EMAIL_DOMAIN. When Google isn't
 * configured (local dev), a shared-password Credentials provider is offered —
 * never in production.
 */
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

const domain = (process.env.ADMIN_EMAIL_DOMAIN ?? 'pehno.in').toLowerCase();
const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const devPassword = process.env.NODE_ENV !== 'production' ? process.env.ADMIN_DEV_PASSWORD : undefined;

export const authOptions: NextAuthOptions = {
  providers: [
    ...(googleConfigured
      ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! })]
      : []),
    ...(devPassword
      ? [
          CredentialsProvider({
            name: 'Dev password',
            credentials: { password: { label: 'Admin dev password', type: 'password' } },
            authorize: async (creds) =>
              creds?.password === devPassword ? { id: 'dev-admin', name: 'Dev Admin', email: `dev@${domain}` } : null,
          }),
        ]
      : []),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    signIn: ({ user }) => Boolean(user.email && user.email.toLowerCase().endsWith(`@${domain}`)),
  },
  pages: { signIn: '/login', error: '/login' },
};

export const authConfigured = googleConfigured || Boolean(devPassword);
