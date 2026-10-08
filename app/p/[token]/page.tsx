// A published portfolio (/p/<token>). The page itself is the client view
// (PortfolioView); this server part gives the link a preview — title, who
// made it, a picture — so a pasted link unfurls in chat. Portfolios are
// public by design (RLS: "Portfolio publicly readable"); it reads through
// the session-less public client. Shared by link: unlisted, never indexed.

import type { Metadata } from 'next';
import { publicClient } from '@/lib/supabase/public';
import { videoEmbed } from '@/lib/studio/media-kind';
import { PortfolioView } from './PortfolioView';

export const dynamic = 'force-dynamic';

/** A picture for the preview: a media item's thumbnail, an image, or a video's poster. */
function previewImage(media: { url: string; thumbnail_url: string | null; media_type: string | null }[]): string | undefined {
  for (const m of media) {
    if (m.thumbnail_url) return m.thumbnail_url;
    if (m.media_type === 'image' || /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(m.url)) return m.url;
    const poster = videoEmbed(m.url)?.thumbnail;
    if (poster) return poster;
  }
  return undefined;
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const db = publicClient();
  const { data } = db && token
    ? await db.from('portfolio_projects')
      .select('title, description, year, role, profiles(username), portfolio_media(url, thumbnail_url, media_type)')
      .eq('share_token', token)
      .maybeSingle()
    : { data: null };
  if (!data) return { title: 'The Cavern', robots: { index: false } };

  const by = (data.profiles as { username?: string } | null)?.username;
  const description = data.description?.trim().slice(0, 200)
    || [data.role, data.year, by ? `by ${by}` : null].filter(Boolean).join(' · ')
    || 'A portfolio on The Cavern.';
  const image = previewImage((data.portfolio_media ?? []) as { url: string; thumbnail_url: string | null; media_type: string | null }[]);
  return {
    title: `${data.title} — The Cavern`,
    description,
    robots: { index: false, follow: false },
    openGraph: { title: data.title, description, type: 'website', ...(image ? { images: [image] } : {}) },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: data.title, description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function PublicPortfolioPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PortfolioView token={token} />;
}
