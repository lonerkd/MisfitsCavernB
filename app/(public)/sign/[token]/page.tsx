// A signing link (/sign/<token>): a person reads a document the production sent them, types their name, agrees, and signs —
// no account. Server-rendered, never cached or indexed. It reads only through get_signing (the exact token), so a withdrawn
// or unknown link looks the same as one that never existed.

import type { Metadata } from 'next';
import { publicClient } from '@/lib/supabase/public';
import { SignClient, type SigningView } from './SignClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign — The Cavern',
  robots: { index: false, follow: false },
};

async function load(token: string): Promise<SigningView | null> {
  const db = publicClient();
  if (!db || !token) return null;
  const { data, error } = await db.rpc('get_signing', { p_token: token });
  if (error || !data || data.length === 0) return null;
  return data[0] as SigningView;
}

export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = await load(token);
  if (!view || view.status === 'void') {
    return (
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '64px 16px', color: 'var(--fg)' }}>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.6rem' }}>This link isn’t available</h1>
        <p style={{ color: 'var(--fg-muted)' }}>It may have been withdrawn or replaced. Ask the person who sent it for a new one.</p>
      </main>
    );
  }
  return <SignClient token={token} view={view} />;
}
