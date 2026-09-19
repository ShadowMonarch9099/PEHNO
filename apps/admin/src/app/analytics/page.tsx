import Link from 'next/link';
import { Card } from '@/components/Card';
import { AffiliateCtrChart, FunnelChart, OutfitsChart, UserGrowthChart } from '@/components/Charts';
import { adminGet, type Analytics } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage({ searchParams }: { searchParams: { days?: string } }) {
  const days = Number(searchParams.days ?? 30);
  const a = await adminGet<Analytics>('/admin/analytics', { days });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex gap-2 text-sm">
          {[7, 30, 90].map((d) => (
            <Link key={d} href={`/analytics?days=${d}`} className={`rounded-full px-3 py-1 ${d === days ? 'bg-brand text-cream' : 'border border-line text-brand'}`}>{d}d</Link>
          ))}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="User growth"><UserGrowthChart data={a.user_growth} /></Card>
        <Card title="Outfit generations by day"><OutfitsChart data={a.outfits_by_day} /></Card>
        <Card title="Affiliate conversion rate by platform"><AffiliateCtrChart data={a.affiliate_ctr} /></Card>
        <Card title="Subscription funnel"><FunnelChart data={a.funnel} /></Card>
      </div>
    </div>
  );
}
