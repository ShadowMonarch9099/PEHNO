'use client';

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Analytics } from '@/lib/api';

const BRAND = '#964900';
const ACCENT = '#426087';
const LINE = '#dbc2ae';

const day = (d: string) => d.slice(5); // MM-DD

export function UserGrowthChart({ data }: { data: Analytics['user_growth'] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ left: -16, right: 8 }}>
        <CartesianGrid stroke={LINE} strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={day} fontSize={11} />
        <YAxis fontSize={11} allowDecimals={false} />
        <Tooltip />
        <Line type="monotone" dataKey="users" stroke={BRAND} strokeWidth={2} dot={false} name="Total users" />
        <Line type="monotone" dataKey="signups" stroke={ACCENT} strokeWidth={1.5} dot={false} name="Signups" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function OutfitsChart({ data }: { data: Analytics['outfits_by_day'] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ left: -16, right: 8 }}>
        <CartesianGrid stroke={LINE} strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={day} fontSize={11} />
        <YAxis fontSize={11} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="outfits" fill={BRAND} radius={[4, 4, 0, 0]} name="Outfits generated" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AffiliateCtrChart({ data }: { data: Analytics['affiliate_ctr'] }) {
  const rows = data.map((r) => ({ ...r, ctr: Math.round(r.conversion_rate * 1000) / 10 }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows} margin={{ left: -16, right: 8 }}>
        <CartesianGrid stroke={LINE} strokeDasharray="3 3" />
        <XAxis dataKey="platform" fontSize={11} />
        <YAxis fontSize={11} unit="%" />
        <Tooltip formatter={(v: number) => `${v}%`} />
        <Bar dataKey="ctr" fill={ACCENT} radius={[4, 4, 0, 0]} name="Conversion rate" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FunnelChart({ data }: { data: Analytics['funnel'] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ left: 24, right: 24 }}>
        <XAxis type="number" fontSize={11} allowDecimals={false} />
        <YAxis type="category" dataKey="stage" fontSize={11} width={80} />
        <Tooltip />
        <Bar dataKey="users" fill={BRAND} radius={[0, 4, 4, 0]} name="Users" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CampaignChart({ data }: { data: Record<string, number | string>[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ left: -16, right: 8 }}>
        <CartesianGrid stroke={LINE} strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={(d: string) => day(d)} fontSize={11} />
        <YAxis fontSize={11} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="view" stackId="a" fill={LINE} name="Views" />
        <Bar dataKey="join" stackId="a" fill={ACCENT} name="Joins" />
        <Bar dataKey="submit" stackId="a" fill={BRAND} name="Outfits" />
        <Bar dataKey="click" stackId="a" fill="#fd8621" name="Clicks" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
