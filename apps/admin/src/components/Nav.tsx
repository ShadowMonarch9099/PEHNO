'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { SessionProvider } from 'next-auth/react';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/users', label: 'Users' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/brands', label: 'Brands' },
];

function NavInner() {
  const path = usePathname();
  const { data } = useSession();
  if (path === '/login') return null;
  return (
    <aside className="w-56 shrink-0 border-r border-line/40 bg-sand p-6 flex flex-col gap-6">
      <div>
        <div className="text-2xl font-extrabold tracking-widest text-brand">PEHNO</div>
        <div className="text-xs text-muted">Admin · पहनो</div>
      </div>
      <nav className="flex flex-col gap-1">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${path.startsWith(l.href) ? 'bg-brand text-cream' : 'text-brand-dark hover:bg-line/30'}`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto text-xs text-muted">
        {data?.user?.email ? <div className="truncate">{data.user.email}</div> : null}
        <button onClick={() => signOut({ callbackUrl: '/login' })} className="mt-2 text-brand hover:underline">
          Sign out
        </button>
      </div>
    </aside>
  );
}

export function Nav() {
  return (
    <SessionProvider>
      <NavInner />
    </SessionProvider>
  );
}
