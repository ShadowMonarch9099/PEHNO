export function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-sand p-5 shadow-sm ${className}`}>
      {title ? <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">{title}</h2> : null}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl bg-sand p-5 shadow-sm">
      <div className="text-3xl font-bold text-brand">{value}</div>
      <div className="text-sm font-medium text-ink">{label}</div>
      {hint ? <div className="text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
