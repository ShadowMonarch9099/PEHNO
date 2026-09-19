import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Not found</h1>
      <Link href="/dashboard" className="text-brand hover:underline">Back to dashboard</Link>
    </div>
  );
}
