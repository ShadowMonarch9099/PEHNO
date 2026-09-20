/**
 * Campaign editor (server-action form). Lists are comma-separated; products are
 * one per line as `name | url | price | image_url | garment_type | color`.
 */
import type { Campaign, CampaignConfig } from '@/lib/api';

export function parseCampaignForm(formData: FormData): { title: string; kind: string; status: string; starts_at: string | null; ends_at: string | null; config: CampaignConfig } {
  const s = (k: string) => String(formData.get(k) ?? '').trim();
  const list = (k: string) =>
    s(k)
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  const products = s('products')
    .split('\n')
    .map((line) => line.split('|').map((x) => x.trim()))
    .filter((p) => p[0] && p[1])
    .map(([name, url, price, image_url, garment_type, color]) => ({
      name,
      url,
      price_inr: price ? Number(price) : null,
      image_url: image_url || null,
      garment_type: garment_type || null,
      color: color || null,
    }));
  const date = (k: string) => (s(k) ? new Date(s(k)).toISOString() : null);
  return {
    title: s('title'),
    kind: s('kind') || 'challenge',
    status: s('status') || 'draft',
    starts_at: date('starts_at'),
    ends_at: date('ends_at'),
    config: {
      description: s('description'),
      hero_image_url: s('hero_image_url') || null,
      cta_url: s('cta_url') || null,
      cta_label: s('cta_label') || 'Shop the collection',
      hashtag: s('hashtag') || null,
      reward_text: s('reward_text') || null,
      target: { cities: list('cities'), tiers: list('tiers'), regional_styles: list('regional_styles'), genders: list('genders') },
      products,
      challenge: {
        goal: Number(s('goal') || 5),
        occasion: s('occasion') || null,
        garment_types: list('garment_types'),
        fabrics: list('fabrics'),
        brand_match: formData.get('brand_match') === 'on',
      },
    },
  };
}

const input = 'w-full rounded-lg border border-line bg-cream px-3 py-2 text-sm';
const label = 'block text-xs font-semibold uppercase tracking-wider text-muted mb-1';

const dt = (iso: string | null) => (iso ? iso.slice(0, 16) : '');

export function CampaignForm({ action, campaign, submitLabel }: { action: (fd: FormData) => Promise<void>; campaign?: Campaign; submitLabel: string }) {
  const c = campaign?.config;
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <label className={label}>Title</label>
        <input name="title" defaultValue={campaign?.title} required minLength={3} className={input} />
      </div>
      <div>
        <label className={label}>Kind</label>
        <select name="kind" defaultValue={campaign?.kind ?? 'challenge'} className={input}>
          <option value="challenge">Challenge — users style N looks</option>
          <option value="collection">Collection — curated products</option>
        </select>
      </div>
      <div>
        <label className={label}>Status</label>
        <select name="status" defaultValue={campaign?.status ?? 'draft'} className={input}>
          <option value="draft">Draft</option>
          <option value="live">Live</option>
          <option value="ended">Ended</option>
        </select>
      </div>
      <div>
        <label className={label}>Starts</label>
        <input name="starts_at" type="datetime-local" defaultValue={dt(campaign?.starts_at ?? null)} className={input} />
      </div>
      <div>
        <label className={label}>Ends</label>
        <input name="ends_at" type="datetime-local" defaultValue={dt(campaign?.ends_at ?? null)} className={input} />
      </div>
      <div className="md:col-span-2">
        <label className={label}>Description</label>
        <textarea name="description" defaultValue={c?.description} rows={3} className={input} />
      </div>
      <div>
        <label className={label}>Hero image URL</label>
        <input name="hero_image_url" defaultValue={c?.hero_image_url ?? ''} className={input} />
      </div>
      <div>
        <label className={label}>Hashtag</label>
        <input name="hashtag" defaultValue={c?.hashtag ?? ''} className={input} />
      </div>
      <div>
        <label className={label}>CTA URL</label>
        <input name="cta_url" defaultValue={c?.cta_url ?? ''} className={input} />
      </div>
      <div>
        <label className={label}>CTA label</label>
        <input name="cta_label" defaultValue={c?.cta_label ?? 'Shop the collection'} className={input} />
      </div>
      <div className="md:col-span-2">
        <label className={label}>Reward text</label>
        <input name="reward_text" defaultValue={c?.reward_text ?? ''} className={input} />
      </div>

      <fieldset className="md:col-span-2 grid gap-3 rounded-lg border border-line/40 p-3 md:grid-cols-4">
        <legend className="px-1 text-xs font-semibold uppercase text-muted">Target segment (blank = everyone)</legend>
        <div><label className={label}>Cities</label><input name="cities" defaultValue={c?.target.cities.join(', ')} placeholder="Pune, Mumbai" className={input} /></div>
        <div><label className={label}>Tiers</label><input name="tiers" defaultValue={c?.target.tiers.join(', ')} placeholder="plus, pro" className={input} /></div>
        <div><label className={label}>Regional styles</label><input name="regional_styles" defaultValue={c?.target.regional_styles.join(', ')} placeholder="mumbai_minimal" className={input} /></div>
        <div><label className={label}>Genders</label><input name="genders" defaultValue={c?.target.genders.join(', ')} placeholder="female" className={input} /></div>
      </fieldset>

      <fieldset className="md:col-span-2 grid gap-3 rounded-lg border border-line/40 p-3 md:grid-cols-4">
        <legend className="px-1 text-xs font-semibold uppercase text-muted">Challenge rules</legend>
        <div><label className={label}>Goal (looks)</label><input name="goal" type="number" min={1} max={30} defaultValue={c?.challenge.goal ?? 5} className={input} /></div>
        <div><label className={label}>Occasion (optional)</label><input name="occasion" defaultValue={c?.challenge.occasion ?? ''} placeholder="office" className={input} /></div>
        <div><label className={label}>Garment types</label><input name="garment_types" defaultValue={c?.challenge.garment_types.join(', ')} placeholder="kurta, palazzo" className={input} /></div>
        <div><label className={label}>Fabrics</label><input name="fabrics" defaultValue={c?.challenge.fabrics.join(', ')} placeholder="linen" className={input} /></div>
        <label className="md:col-span-4 flex items-center gap-2 text-sm">
          <input type="checkbox" name="brand_match" defaultChecked={c?.challenge.brand_match ?? false} /> Pieces tagged with this brand also count
        </label>
      </fieldset>

      <div className="md:col-span-2">
        <label className={label}>Products — one per line: name | url | price | image_url | garment_type | color</label>
        <textarea
          name="products"
          rows={4}
          defaultValue={c?.products.map((p) => [p.name, p.url, p.price_inr ?? '', p.image_url ?? '', p.garment_type ?? '', p.color ?? ''].join(' | ')).join('\n')}
          className={`${input} font-mono text-xs`}
        />
      </div>
      <div className="md:col-span-2">
        <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-cream">{submitLabel}</button>
      </div>
    </form>
  );
}
