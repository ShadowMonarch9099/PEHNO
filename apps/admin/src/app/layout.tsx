import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = { title: 'PEHNO Admin', description: 'Operations dashboard' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <Nav />
          <main className="flex-1 p-8 max-w-7xl">{children}</main>
        </div>
      </body>
    </html>
  );
}
