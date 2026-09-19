import Link from 'next/link';
import { Card } from '@/components/Card';
import { adminGet, type UsersPage } from '@/lib/api';

export const dynamic = 'force-dynamic';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default async function UsersPage({ searchParams }: { searchParams: { q?: string; tier?: string; page?: string } }) {
  const page = Number(searchParams.page ?? 1);
  const data = await adminGet<UsersPage>('/admin/users', { q: searchParams.q, tier: searchParams.tier, page, page_size: 50 });
  const pages = Math.max(1, Math.ceil(data.total / data.page_size));
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold">Users <span className="text-base font-normal text-muted">({data.total})</span></h1>
        <form className="flex gap-2">
          <input name="q" defaultValue={searchParams.q} placeholder="Search name, phone, city" className="rounded-lg border border-line bg-cream px-3 py-2 text-sm" />
          <select name="tier" defaultValue={searchParams.tier ?? ''} className="rounded-lg border border-line bg-cream px-3 py-2 text-sm">
            <option value="">All tiers</option><option value="free">Free</option><option value="plus">Plus</option><option value="pro">Pro</option>
          </select>
          <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-cream">Filter</button>
        </form>
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted">
            <tr><th className="py-2">Name</th><th>Phone</th><th>City</th><th>Tier</th><th>Garments</th><th>Joined</th><th>Last active</th></tr>
          </thead>
          <tbody>
            {data.items.map((u) => (
              <tr key={u.id} className="border-t border-line/30 hover:bg-line/20">
                <td className="py-2"><Link href={`/users/${u.id}`} className="font-medium text-brand hover:underline">{u.name || '—'}</Link></td>
                <td>{u.phone}</td><td>{u.city}</td>
                <td><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.tier === 'free' ? 'bg-line/40' : 'bg-brand text-cream'}`}>{u.tier}</span></td>
                <td>{u.garment_count}</td><td>{fmt(u.joined_at)}</td><td>{fmt(u.last_active_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages > 1 ? (
          <div className="mt-4 flex gap-2 text-sm">
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <Link key={p} href={{ pathname: '/users', query: { ...searchParams, page: p } }} className={`rounded px-2 py-1 ${p === page ? 'bg-brand text-cream' : 'text-brand'}`}>{p}</Link>
            ))}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
