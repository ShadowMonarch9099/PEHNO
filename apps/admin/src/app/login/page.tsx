'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function LoginForm() {
  const params = useSearchParams();
  const error = params.get('error');
  const [password, setPassword] = useState('');
  return (
    <div className="mx-auto mt-24 max-w-sm rounded-2xl bg-sand p-8 shadow-sm">
      <div className="text-3xl font-extrabold tracking-widest text-brand">PEHNO</div>
      <div className="mb-6 text-sm text-muted">Admin sign-in — company Google accounts only.</div>
      {error ? <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Sign-in failed or not allowed for this account.</div> : null}
      <button
        onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
        className="w-full rounded-full bg-brand px-4 py-3 text-sm font-semibold text-cream hover:opacity-90"
      >
        Continue with Google
      </button>
      <form
        className="mt-6 border-t border-line/40 pt-6"
        onSubmit={(e) => {
          e.preventDefault();
          void signIn('credentials', { password, callbackUrl: '/dashboard' });
        }}
      >
        <label className="text-xs text-muted">Dev password (local only)</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-cream px-3 py-2 text-sm"
        />
        <button type="submit" className="mt-3 w-full rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand">
          Sign in
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
