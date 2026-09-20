import { revalidatePath } from 'next/cache';
import { Card } from '@/components/Card';
import { adminGet, adminPost, type AdminStylist, type StylistMarketplace } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function setVerified(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  const verified = formData.get('verified') === 'true';
  if (!id) return;
  await adminPost(`/admin/stylists/${id}/verify`, { verified });
  revalidatePath('/stylists');
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export default async function StylistsPage() {
  const [stylists, market] = await Promise.all([adminGet<AdminStylist[]>('/admin/stylists'), adminGet<StylistMarketplace>('/admin/stylists/bookings', { days: 30 })]);
  const pending = stylists.filter((s) => !s.verified);
  const verified = stylists.filter((s) => s.verified);

  const Row = ({ s }: { s: AdminStylist }) => (
    <tr className="border-t border-line/30 align-top">
      <td className="py-2">
        <div className="font-medium">{s.name}</div>
        <div className="text-xs text-muted">{s.phone} · {s.city}</div>
        {s.bio ? <div className="mt-1 max-w-md text-xs text-brand-dark">{s.bio}</div> : null}
        {s.portfolio_urls.length ? (
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            {s.portfolio_urls.map((u) => (
              <a key={u} href={u} target="_blank" rel="noreferrer" className="text-brand hover:underline">{u.replace(/^https?:\/\//, '')}</a>
            ))}
          </div>
        ) : null}
      </td>
      <td className="py-2 text-xs capitalize">{s.specialties.map((x) => x.replace(/_/g, ' ')).join(', ')}</td>
      <td className="py-2">{inr(s.price_per_session_inr)}</td>
      <td className="py-2">{s.bookings} / {s.sessions_completed}</td>
      <td className="py-2 text-xs text-muted">{s.applied_at ? new Date(s.applied_at).toLocaleDateString('en-IN') : '—'}</td>
      <td className="py-2">
        <form action={setVerified}>
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="verified" value={s.verified ? 'false' : 'true'} />
          <button className={`rounded-lg px-3 py-1 text-xs font-semibold ${s.verified ? 'border border-line text-brand-dark' : 'bg-brand text-cream'}`}>
            {s.verified ? 'Unlist' : 'Verify & list'}
          </button>
        </form>
      </td>
    </tr>
  );

  const Table = ({ rows, empty }: { rows: AdminStylist[]; empty: string }) => (
    <table className="w-full text-sm">
      <thead className="text-left text-xs uppercase text-muted">
        <tr><th className="py-2">Stylist</th><th>Specialties</th><th>Price</th><th>Bookings / done</th><th>Applied</th><th /></tr>
      </thead>
      <tbody>
        {rows.map((s) => <Row key={s.id} s={s} />)}
        {!rows.length ? <tr><td colSpan={6} className="py-4 text-muted">{empty}</td></tr> : null}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Stylist marketplace</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card title="GMV · 30d"><div className="text-2xl font-bold">{inr(market.gmv_inr)}</div></Card>
        <Card title="Commission · 30d"><div className="text-2xl font-bold">{inr(market.commission_inr)}</div></Card>
        <Card title="Confirmed / completed"><div className="text-2xl font-bold">{market.by_status.confirmed ?? 0} / {market.by_status.completed ?? 0}</div></Card>
        <Card title="Pending applications"><div className="text-2xl font-bold">{pending.length}</div></Card>
      </div>
      <Card title={`Applications awaiting verification (${pending.length})`}>
        <Table rows={pending} empty="Nothing to review." />
      </Card>
      <Card title={`Listed stylists (${verified.length})`}>
        <Table rows={verified} empty="No verified stylists yet." />
      </Card>
    </div>
  );
}
