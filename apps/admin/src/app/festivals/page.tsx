import { revalidatePath } from 'next/cache';
import { Card } from '@/components/Card';
import { adminDelete, adminGet, adminPost, type FestivalAdmin } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function setDates(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug') ?? '');
  const year = Number(formData.get('year'));
  const start = String(formData.get('start_date') ?? '');
  if (!slug || !year || !start) return;
  await adminPost(
    `/admin/festivals/${slug}/dates`,
    { year, start_date: start, end_date: String(formData.get('end_date') ?? '') || null, note: String(formData.get('note') ?? '') || null },
    'PUT',
  );
  revalidatePath('/festivals');
}

async function clearDates(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug') ?? '');
  const year = Number(formData.get('year'));
  if (!slug || !year) return;
  await adminDelete(`/admin/festivals/${slug}/dates/${year}`);
  revalidatePath('/festivals');
}

const input = 'rounded-lg border border-line bg-cream px-2 py-1 text-xs';
const thisYear = new Date().getFullYear();

export default async function FestivalsPage() {
  const festivals = await adminGet<FestivalAdmin[]>('/admin/festivals');
  const years = [String(thisYear), String(thisYear + 1)];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Festival calendar</h1>
        <p className="text-sm text-muted">
          Dates come from <code>packages/ai/data/festivals.json</code>. Lunar festivals drift every year — correct a single year here; the app,
          alerts and curated looks pick the override up immediately without a deploy.
        </p>
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted">
            <tr>
              <th className="py-2">Festival</th>
              <th>Regions</th>
              {years.map((y) => (
                <th key={y}>{y}</th>
              ))}
              <th>Override a year</th>
            </tr>
          </thead>
          <tbody>
            {festivals.map((f) => (
              <tr key={f.slug} className="border-t border-line/30 align-top">
                <td className="py-2">
                  <div className="font-medium">{f.name}</div>
                  <div className="text-xs text-muted">
                    {f.approximate_month}
                    {f.lunar_calendar ? ' · lunar' : ''}
                    {f.duration_days > 1 ? ` · ${f.duration_days} days` : ''}
                  </div>
                </td>
                <td className="text-xs text-muted">{f.regions.join(', ')}</td>
                {years.map((y) => {
                  const o = f.overrides.find((x) => String(x.year) === y);
                  return (
                    <td key={y} className="text-xs">
                      {o ? (
                        <div>
                          <span className="rounded-full bg-brand px-2 py-0.5 text-cream">{o.start_date}</span>
                          <div className="mt-1 text-muted line-through">{f.dates[y] ?? '—'}</div>
                          {o.note ? <div className="text-muted">{o.note}</div> : null}
                          <form action={clearDates} className="mt-1">
                            <input type="hidden" name="slug" value={f.slug} />
                            <input type="hidden" name="year" value={y} />
                            <button className="text-brand hover:underline">reset</button>
                          </form>
                        </div>
                      ) : (
                        <span>{f.dates[y] ?? '—'}</span>
                      )}
                    </td>
                  );
                })}
                <td>
                  <form action={setDates} className="flex flex-wrap items-center gap-1">
                    <input type="hidden" name="slug" value={f.slug} />
                    <select name="year" defaultValue={String(thisYear + 1)} className={input}>
                      {[thisYear - 1, thisYear, thisYear + 1, thisYear + 2].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                    <input name="start_date" type="date" required className={input} />
                    <input name="end_date" type="date" className={input} title="End date (optional)" />
                    <input name="note" placeholder="note" className={`${input} w-24`} />
                    <button className="rounded-lg bg-brand px-2 py-1 text-xs font-semibold text-cream">Set</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
