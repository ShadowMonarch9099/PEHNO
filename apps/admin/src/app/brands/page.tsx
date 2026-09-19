import { revalidatePath } from 'next/cache';
import { Card } from '@/components/Card';
import { adminGet, adminPost, type Brand } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function addBrand(formData: FormData) {
  'use server';
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return;
  await adminPost('/admin/brands', { name, website: String(formData.get('website') ?? '') || null });
  revalidatePath('/brands');
}

export default async function BrandsPage() {
  const brands = await adminGet<Brand[]>('/admin/brands');
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Brand partners <span className="text-base font-normal text-muted">· scaffold (campaigns arrive in Phase 3)</span></h1>
      <Card>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted"><tr><th className="py-2">Brand</th><th>Status</th><th>Campaigns</th><th>Website</th></tr></thead>
          <tbody>
            {brands.map((b) => (
              <tr key={b.id} className="border-t border-line/30">
                <td className="py-2 font-medium">{b.name}</td>
                <td><span className="rounded-full bg-line/40 px-2 py-0.5 text-xs capitalize">{b.status}</span></td>
                <td>{b.campaign_count}</td>
                <td>{b.website ? <a href={b.website} className="text-brand hover:underline" target="_blank" rel="noreferrer">{b.website}</a> : '—'}</td>
              </tr>
            ))}
            {!brands.length ? <tr><td colSpan={4} className="py-4 text-muted">No partners yet. Targets: Fabindia, W, Biba, FabAlley, Libas.</td></tr> : null}
          </tbody>
        </table>
      </Card>
      <Card title="Add a prospect">
        <form action={addBrand} className="flex gap-2">
          <input name="name" placeholder="Brand name" required className="rounded-lg border border-line bg-cream px-3 py-2 text-sm" />
          <input name="website" placeholder="https://" className="rounded-lg border border-line bg-cream px-3 py-2 text-sm" />
          <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-cream">Add</button>
        </form>
      </Card>
    </div>
  );
}
