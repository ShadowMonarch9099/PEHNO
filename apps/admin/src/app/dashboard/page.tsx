import { Card, Stat, inr } from '@/components/Card';
import { adminGet, type Metrics } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const m = await adminGet<Metrics>('/admin/metrics');
  const acceptance = m.activity.classification_acceptance;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total users" value={m.users.total} hint={`${m.users.by_tier.plus ?? 0} Plus · ${m.users.by_tier.pro ?? 0} Pro`} />
        <Stat label="DAU" value={m.users.dau} hint="logged in last 24h" />
        <Stat label="MRR" value={inr(m.revenue.mrr_inr)} hint={`${m.revenue.active_subscriptions} active subs`} />
        <Stat label="Affiliate (30d)" value={inr(m.revenue.affiliate_30d_inr)} hint="commission" />
        <Stat label="Outfits today" value={m.activity.outfits_24h} />
        <Stat label="Classification acceptance" value={acceptance == null ? '—' : `${Math.round(acceptance * 100)}%`} hint={`${m.activity.garments_verified}/${m.activity.garments} verified`} />
      </div>
      <Card title="Affiliate clicks by platform (30 days)">
        {m.affiliate_30d.length ? (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted">
              <tr><th className="py-2">Platform</th><th>Clicks</th><th>Conversions</th><th>Commission</th></tr>
            </thead>
            <tbody>
              {m.affiliate_30d.map((r) => (
                <tr key={r.platform} className="border-t border-line/30">
                  <td className="py-2 capitalize">{r.platform}</td><td>{r.clicks}</td><td>{r.conversions}</td><td>{inr(r.commission_inr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted">No affiliate clicks yet.</p>
        )}
      </Card>
    </div>
  );
}
