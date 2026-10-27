// A review link (/review/<token>): a client reads the versions sent to them,
// comments, and approves or asks for changes — no account. Server-rendered and
// never cached or indexed. It reads only through get_review (the exact token,
// while the link is live), so revoking or expiring a link closes it at once; an
// unknown, revoked and expired link look the same.

import type { Metadata } from 'next';
import { publicClient } from '@/lib/supabase/public';
import type { GuestReview } from '@/lib/review/versions';
import { ReviewClient } from './ReviewClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Review — The Cavern',
  robots: { index: false, follow: false },
};

async function load(token: string): Promise<GuestReview | null> {
  const db = publicClient();
  if (!db || !token) return null;
  const { data, error } = await db.rpc('get_review', { p_token: token });
  if (error || !data) return null;
  return data as unknown as GuestReview;
}

export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const review = await load(token);
  if (!review) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '64px 16px', color: 'var(--fg)' }}>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.6rem' }}>This link isn’t available</h1>
        <p style={{ color: 'var(--fg-muted)' }}>It may have been replaced or closed. Ask the person who sent it for a new one.</p>
      </div>
    );
  }
  return <ReviewClient token={token} review={review} />;
}
