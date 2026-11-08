// A person's own portfolio page (/u/<username>): the person at the top, their PUBLIC pieces below, each linking to its own page.
// Off until they publish it: an unknown name and a page that is off are the same not-found. Link only (unlisted) is reachable but
// never indexed; only a public page is. It reads through the session-less public client and get_portfolio_page, so a signed-out
// visitor sees exactly what the database hands out and nothing else.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPortfolioPage, publicClient } from '@/lib/supabase/public';
import { headerOf } from '@/lib/portfolio/header';
import { pageIsIndexable } from '@/lib/portfolio/page-setting';
import { PrintOneSheetButton } from '@/components/portfolio/PrintOneSheetButton';
import { laurelLine } from '@/lib/portfolio/laurels';
import { groupPageCredits } from '@/lib/portfolio/page-credits';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ handle: string }> };
const decode = (h: string) => { try { return decodeURIComponent(h); } catch { return h; } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const handle = decode((await params).handle);
  const data = await getPortfolioPage(publicClient(), handle);
  if (!data) return { title: 'The Cavern', robots: { index: false, follow: false } };
  const head = headerOf(data.profile);
  const description = head.bio.slice(0, 200) || [head.line, `${data.pieces.length} piece${data.pieces.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ');
  const image = data.pieces.find((p) => p.cover_url)?.cover_url ?? head.avatarUrl ?? undefined;
  const index = pageIsIndexable(data.page);
  return {
    title: `${head.name} — The Cavern`,
    description,
    robots: { index, follow: index },
    openGraph: { title: head.name, description, type: 'profile', ...(image ? { images: [image] } : {}) },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: head.name, description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function PersonPortfolioPage({ params }: Params) {
  const handle = decode((await params).handle);
  const data = await getPortfolioPage(publicClient(), handle);
  if (!data) notFound();
  const head = headerOf(data.profile);
  const films = groupPageCredits(data.credits);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', padding: 'clamp(24px, 5vw, 64px)' }}>
      <header style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', maxWidth: 960, margin: '0 auto 40px' }}>
        {head.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- a person's own avatar link, not a next/image host
          <img src={head.avatarUrl} alt="" width={72} height={72} referrerPolicy="no-referrer" style={{ borderRadius: '50%', objectFit: 'cover' }} />
        )}
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(2rem, 6vw, 3.5rem)', lineHeight: 1, margin: 0, wordBreak: 'break-word' }}>{head.name}</h1>
          {head.line && <p style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: 'var(--caps-track)', color: 'var(--fg-dim)', margin: '8px 0 0' }}>{head.line}</p>}
          {head.openToWork && <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)', margin: '6px 0 0' }}>Open to work</p>}
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: '0 auto 24px' }}><PrintOneSheetButton data={data} /></div>

      {head.bio && <p style={{ maxWidth: 640, margin: '0 auto 40px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{head.bio}</p>}

      <section aria-label="Work" style={{ maxWidth: 960, margin: '0 auto' }}>
        {data.pieces.length === 0 ? (
          <p style={{ color: 'var(--fg-dim)' }}>Nothing public here yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {data.pieces.map((p) => (
              <li key={p.share_token}>
                <Link href={`/p/${p.share_token}`} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
                  <div style={{ aspectRatio: '16 / 9', borderRadius: 8, overflow: 'hidden', background: 'var(--panel-2)', border: '1px solid var(--border)' }}>
                    {p.cover_url && (
                      // eslint-disable-next-line @next/next/no-img-element -- a person's own cover link, not a next/image host
                      <img src={p.cover_url} alt="" loading="lazy" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    )}
                  </div>
                  <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.25rem', margin: '10px 0 2px' }}>{p.title}</h2>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 'var(--caps-track)', color: 'var(--fg-dim)', margin: 0 }}>
                    {[p.role, p.category, p.year].filter(Boolean).join(' · ')}
                  </p>
                </Link>
                {p.laurels.length > 0 && (
                  <ul aria-label={`${p.title}: festivals and awards, as the filmmaker reports them`} style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', display: 'grid', gap: 2 }}>
                    {p.laurels.map((l, i) => <li key={i}>{laurelLine(l)}</li>)}
                    <li>reported by the filmmaker</li>
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.verified_laurels.length > 0 && (
        <section aria-label="Festivals and awards" style={{ maxWidth: 960, margin: '48px auto 0' }}>
          <h2 style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: 'var(--caps-track)', color: 'var(--fg-dim)', margin: '0 0 12px' }}>FESTIVALS · RECORDED BY THE FILM’S OWN TEAM</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
            {data.verified_laurels.map((l, i) => (
              <li key={i} style={{ borderTop: '1px solid var(--border)', padding: '8px 0', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--display)', fontSize: '1.05rem' }}>{l.name}</span>
                <Link href={`/shared/${l.share_token}`} style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)' }}>{l.film}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {films.length > 0 && (
        <section aria-label="Credits" style={{ maxWidth: 960, margin: '48px auto 0' }}>
          <h2 style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: 'var(--caps-track)', color: 'var(--fg-dim)', margin: '0 0 12px' }}>CREDITS</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {films.map((f) => (
              <li key={f.token} style={{ borderTop: '1px solid var(--border)', padding: '10px 0' }}>
                <Link href={`/shared/${f.token}`} style={{ color: 'inherit', textDecoration: 'none', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--display)', fontSize: '1.1rem' }}>{f.title}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 'var(--caps-track)', color: 'var(--fg-dim)' }}>
                    {[f.labels.join(', '), f.type, f.year].filter(Boolean).join(' · ')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p style={{ maxWidth: 960, margin: '56px auto 0', fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: 'var(--caps-track)' }}>
        <Link href="/portfolios" style={{ color: 'var(--accent)' }}>More portfolios →</Link>
      </p>
    </main>
  );
}
