import { ImageResponse } from 'next/og';
import { getPortfolioPage, publicClient } from '@/lib/supabase/public';
import { SHARE_CARD_COLORS as C, shareCardText } from '@/lib/portfolio/share-card';

// The card a link to a person's page shows when they have no cover or avatar of their own (the page's metadata leads with those when
// there is one). Reads through the same public function as the page, so a private or off page gets the plain suite card text.
export const alt = 'A portfolio on The Cavern';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const dynamic = 'force-dynamic';

const decode = (h: string) => { try { return decodeURIComponent(h); } catch { return h; } };

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const data = await getPortfolioPage(publicClient(), decode((await params).handle));
  const text = data ? shareCardText(data.profile, data.pieces.length, data.credits.length) : { name: 'The Cavern', line: 'by Misfits Cavern', count: '' };
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: C.ink, color: C.cream, padding: 80 }}>
        <div style={{ fontSize: 30, color: C.ember, letterSpacing: 4 }}>THE CAVERN</div>
        <div style={{ fontSize: 112, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05, marginTop: 24 }}>{text.name}</div>
        {text.line && <div style={{ fontSize: 44, color: C.ember, marginTop: 20 }}>{text.line}</div>}
        {text.count && <div style={{ fontSize: 32, color: C.dim, marginTop: 36 }}>{text.count}</div>}
      </div>
    ),
    size,
  );
}
