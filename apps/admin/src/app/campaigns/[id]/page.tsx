import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { Card } from '@/components/Card';
import { CampaignForm, parseCampaignForm } from '@/components/CampaignForm';
import { CampaignChart } from '@/components/Charts';
import { AdminApiError, adminGet, adminPost, type Campaign, type CampaignPerformance } from '@/lib/api';

export const dynamic = 'force-dynamic';

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default async function CampaignPage({ params, searchParams }: { params: { id: string }; searchParams: { days?: string } }) {
  const days = Number(searchParams.days ?? 30);
  let campaign: Campaign;
  let perf: CampaignPerformance;
  try {
    [campaign, perf] = await Promise.all([adminGet<Campaign>(`/admin/campaigns/${params.id}`), adminGet<CampaignPerformance>(`/admin/campaigns/${params.id}/performance`, { days })]);
  } catch (e) {
    if (e instanceof AdminApiError && e.status === 404) notFound();
    throw e;
  }

  async function update(formData: FormData) {
    'use server';
    await adminPost(`/admin/campaigns/${params.id}`, parseCampaignForm(formData), 'PATCH');
    revalidatePath(`/campaigns/${params.id}`);
  }

  const Stat = ({ k, v, sub }: { k: string; v: string | number; sub?: string }) => (
    <Card title={k}>
      <div className="text-2xl font-bold">{v}</div>
      {sub ? <div className="text-xs text-muted">{sub}</div> : null}
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/brands/${campaign.brand_id}`} className="text-sm text-brand hover:underline">← Brand</Link>
        <h1 className="text-2xl font-bold">
          {campaign.title}
          <span className={`ml-2 rounded-full px-2 py-0.5 align-middle text-xs capitalize ${campaign.live ? 'bg-green-100 text-green-800' : 'bg-line/40'}`}>{campaign.live ? 'live' : campaign.status}</span>
        </h1>
        <div className="mt-1 flex gap-2 text-xs text-muted">
          Performance window:
          {[7, 30, 90].map((d) => (
            <Link key={d} href={`/campaigns/${params.id}?days=${d}`} className={d === days ? 'font-semibold text-brand' : 'hover:underline'}>{d}d</Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat k="Views" v={perf.views} sub={`${perf.unique_viewers} unique`} />
        <Stat k="Participants" v={perf.participants} sub={`${perf.joins} joins in window`} />
        <Stat k="Outfits submitted" v={perf.outfits_submitted} sub={`${perf.completions} completed · ${perf.saves} saved`} />
        <Stat k="Click-throughs" v={perf.clicks} sub={`CTR ${pct(perf.click_through_rate)} · ${perf.affiliate.conversions} conversions · ₹${perf.affiliate.commission_inr}`} />
      </div>

      <Card title="Daily activity">
        {perf.by_day.length ? <CampaignChart data={perf.by_day} /> : <div className="text-sm text-muted">No activity in this window.</div>}
      </Card>

      <Card title="Edit campaign">
        <CampaignForm action={update} campaign={campaign} submitLabel="Save changes" />
      </Card>
    </div>
  );
}
