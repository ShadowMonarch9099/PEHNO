import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/Card';
import { AdminApiError, adminGet } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface Garment {
  id: string;
  image_url: string;
  thumbnail_url: string | null;
  garment_type: string;
  fabric_type: string;
  color_primary: string;
  classification_status: string;
  user_verified: boolean;
  ai_confidence: number;
  wear_count: number;
}

export default async function UserWardrobePage({ params }: { params: { id: string } }) {
  let data: { user: { name: string; phone: string; city: string; tier: string }; garments: Garment[] };
  try {
    data = await adminGet(`/admin/users/${params.id}/wardrobe`);
  } catch (e) {
    if (e instanceof AdminApiError && e.status === 404) notFound();
    throw e;
  }
  return (
    <div className="space-y-6">
      <Link href="/users" className="text-sm text-brand hover:underline">← Users</Link>
      <h1 className="text-2xl font-bold">{data.user.name || data.user.phone} <span className="text-base font-normal text-muted">· {data.user.city} · {data.user.tier}</span></h1>
      <Card title={`Wardrobe (${data.garments.length})`}>
        <div className="grid grid-cols-3 gap-4 md:grid-cols-5 lg:grid-cols-6">
          {data.garments.map((g) => (
            <div key={g.id} className="overflow-hidden rounded-xl bg-cream text-xs shadow-sm">
              
              <img src={g.thumbnail_url ?? g.image_url} alt={g.garment_type} className="aspect-[0.8] w-full object-cover" />
              <div className="p-2">
                <div className="font-semibold capitalize">{g.garment_type.replace('_', ' ')}</div>
                <div className="text-muted capitalize">{g.color_primary} · {g.fabric_type.replace('_', ' ')}</div>
                <div className="text-muted">{g.user_verified ? '✓ verified' : `${g.classification_status} · ${Math.round(g.ai_confidence * 100)}%`} · {g.wear_count} wears</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
