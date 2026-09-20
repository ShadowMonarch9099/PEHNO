import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { Card } from '@/components/Card';
import { CampaignForm, parseCampaignForm } from '@/components/CampaignForm';
import { AdminApiError, adminGet, adminPost, type BrandDetail } from '@/lib/api';

export const dynamic = 'force-dynamic';

const inr = (n: number | null) => (n == null ? '—' : `₹${n.toLocaleString('en-IN')}`);

export default async function BrandPage({ params }: { params: { id: string } }) {
  let brand: BrandDetail;
  try {
    brand = await adminGet(`/admin/brands/${params.id}`);
  } catch (e) {
    if (e instanceof AdminApiError && e.status === 404) notFound();
    throw e;
  }

  async function updateBrand(formData: FormData) {
    'use server';
    await adminPost(
      `/admin/brands/${params.id}`,
      {
        status: String(formData.get('status')),
        website: String(formData.get('website') ?? '') || null,
        tagline: String(formData.get('tagline') ?? '') || null,
        contact_email: String(formData.get('contact_email') ?? '') || null,
        logo_url: String(formData.get('logo_url') ?? '') || null,
        notes: String(formData.get('notes') ?? '') || null,
      },
      'PATCH',
    );
    revalidatePath(`/brands/${params.id}`);
  }

  async function createCampaign(formData: FormData) {
    'use server';
    await adminPost(`/admin/brands/${params.id}/campaigns`, parseCampaignForm(formData));
    revalidatePath(`/brands/${params.id}`);
  }

  const input = 'rounded-lg border border-line bg-cream px-3 py-2 text-sm';
  return (
    <div className="space-y-6">
      <div>
        <Link href="/brands" className="text-sm text-brand hover:underline">← Brands</Link>
        <h1 className="text-2xl font-bold">{brand.name} <span className="ml-2 rounded-full bg-line/40 px-2 py-0.5 align-middle text-xs capitalize">{brand.status}</span></h1>
        {brand.tagline ? <p className="text-muted">{brand.tagline}</p> : null}
      </div>

      <Card title="Partner details">
        <form action={updateBrand} className="grid gap-2 md:grid-cols-3">
          <select name="status" defaultValue={brand.status} className={input}>
            <option value="prospect">Prospect</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
          <input name="website" defaultValue={brand.website ?? ''} placeholder="https://" className={input} />
          <input name="contact_email" defaultValue={brand.contact_email ?? ''} placeholder="partner@brand.com" className={input} />
          <input name="tagline" defaultValue={brand.tagline ?? ''} placeholder="Tagline" className={input} />
          <input name="logo_url" defaultValue={brand.logo_url ?? ''} placeholder="Logo URL" className={input} />
          <input name="notes" defaultValue={brand.notes ?? ''} placeholder="Notes (internal)" className={input} />
          <div className="md:col-span-3"><button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-cream">Save</button></div>
        </form>
      </Card>

      <Card title={`Campaigns (${brand.campaigns.length})`}>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted"><tr><th className="py-2">Title</th><th>Kind</th><th>Status</th><th>Window</th><th>Participants</th><th>Goal</th></tr></thead>
          <tbody>
            {brand.campaigns.map((c) => (
              <tr key={c.id} className="border-t border-line/30">
                <td className="py-2"><Link href={`/campaigns/${c.id}`} className="font-medium text-brand hover:underline">{c.title}</Link></td>
                <td className="capitalize">{c.kind}</td>
                <td><span className={`rounded-full px-2 py-0.5 text-xs capitalize ${c.live ? 'bg-green-100 text-green-800' : 'bg-line/40'}`}>{c.live ? 'live' : c.status}</span></td>
                <td className="text-xs text-muted">{c.starts_at ? new Date(c.starts_at).toLocaleDateString('en-IN') : '—'} → {c.ends_at ? new Date(c.ends_at).toLocaleDateString('en-IN') : '—'}</td>
                <td>{c.participants}</td>
                <td>{c.kind === 'challenge' ? `${c.config.challenge.goal} looks` : `${c.config.products.length} products · ${inr(c.config.products[0]?.price_inr ?? null)}+`}</td>
              </tr>
            ))}
            {!brand.campaigns.length ? <tr><td colSpan={6} className="py-4 text-muted">No campaigns yet.</td></tr> : null}
          </tbody>
        </table>
      </Card>

      <Card title="New campaign">
        <CampaignForm action={createCampaign} submitLabel="Create campaign" />
      </Card>
    </div>
  );
}
