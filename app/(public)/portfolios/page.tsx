// The public directory of portfolios (/portfolios): the people whose own page is public, with search by name, craft or place.
// A page set to link only is never listed (that is the opt-out); a page that is off does not exist. Server-rendered through the
// session-less public client and list_public_portfolios, so a signed-out visitor sees exactly what the database hands out.
// Searches are never indexed (an endless set of pages); the plain directory is.

import type { Metadata } from 'next';
import Link from 'next/link';
import { listCraftNames, listPublicPortfolios, publicClient } from '@/lib/supabase/public';
import { DIRECTORY_PAGE_SIZE, directoryHref, parsePage, parseQuery } from '@/lib/portfolio/directory';
import { pagePath } from '@/lib/portfolio/page-setting';
import { headerOf } from '@/lib/portfolio/header';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q, page } = await searchParams;
  const plain = !parseQuery(q) && parsePage(page) === 1;
  return {
    title: 'Portfolios — The Cavern',
    description: 'Filmmakers on The Cavern and their work: directors, writers, crew and cast, in their own words.',
    robots: { index: plain, follow: plain },
  };
}

export default async function PortfoliosPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = parseQuery(sp.q);
  const page = parsePage(sp.page);
  // One more than a page, to know whether there is a next one.
  const db = publicClient();
  const crafts = await listCraftNames(db);
  const rows = await listPublicPortfolios(db, { q, limit: DIRECTORY_PAGE_SIZE + 1, offset: (page - 1) * DIRECTORY_PAGE_SIZE });
  const shown = rows.slice(0, DIRECTORY_PAGE_SIZE);
  const more = rows.length > DIRECTORY_PAGE_SIZE;

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', padding: 'clamp(24px, 5vw, 64px)' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(2rem, 6vw, 3.5rem)', lineHeight: 1, margin: '0 0 8px' }}>Portfolios</h1>
        <p style={{ color: 'var(--fg-dim)', margin: '0 0 24px', maxWidth: 560 }}>Filmmakers who have chosen to be found, and the work they have made public.</p>

        <form action="/portfolios" method="get" role="search" style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
          <label htmlFor="portfolio-search" className="sr-only">Search by name, craft or place</label>
          <input id="portfolio-search" name="q" defaultValue={q} placeholder="Name, craft or place" maxLength={80}
            style={{ flex: '1 1 240px', padding: '10px 12px', background: 'var(--bg-2)', color: 'var(--fg)', border: '1px solid var(--border-2)', borderRadius: 4 }} />
          <button type="submit" style={{ padding: '10px 16px', background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 'var(--caps-track)' }}>SEARCH</button>
        </form>

        {crafts.length > 0 && (
          <nav aria-label="Filter by craft" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '-16px 0 28px' }}>
            {crafts.map((c) => {
              const on = c.toLowerCase() === q.toLowerCase();
              return (
                <Link key={c} href={on ? '/portfolios' : directoryHref(c, 1)} aria-current={on ? 'true' : undefined}
                  style={{ padding: '4px 10px', borderRadius: 9999, border: '1px solid var(--border-2)', fontFamily: 'var(--mono)', fontSize: 11, textDecoration: 'none', color: on ? 'var(--on-accent)' : 'var(--fg-dim)', background: on ? 'var(--accent)' : 'transparent' }}>
                  {c}
                </Link>
              );
            })}
          </nav>
        )}

        {shown.length === 0 ? (
          <p style={{ color: 'var(--fg-dim)' }}>{q ? `No portfolio matches “${q}”.` : 'No one has published a portfolio yet.'}</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {shown.map((p) => {
              const head = headerOf(p);
              return (
                <li key={p.username}>
                  <Link href={pagePath(p.username)} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
                    <div style={{ aspectRatio: '16 / 9', borderRadius: 8, overflow: 'hidden', background: 'var(--panel-2)', border: '1px solid var(--border)' }}>
                      {p.cover_url && (
                        // eslint-disable-next-line @next/next/no-img-element -- a person's own cover link, not a next/image host
                        <img src={p.cover_url} alt="" loading="lazy" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      )}
                    </div>
                    <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.25rem', margin: '10px 0 2px', wordBreak: 'break-word' }}>{head.name}</h2>
                    <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 'var(--caps-track)', color: 'var(--fg-dim)', margin: 0 }}>
                      {[head.line, p.pieces > 0 ? `${p.pieces} piece${p.pieces === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ')}
                    </p>
                    {head.openToWork && <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', margin: '4px 0 0' }}>Open to work</p>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {(page > 1 || more) && (
          <nav aria-label="Pages" style={{ display: 'flex', gap: 16, marginTop: 32, fontFamily: 'var(--mono)', fontSize: 12 }}>
            {page > 1 && <Link href={directoryHref(q, page - 1)} style={{ color: 'var(--accent)' }}>← Previous</Link>}
            {more && <Link href={directoryHref(q, page + 1)} style={{ color: 'var(--accent)' }}>Next →</Link>}
          </nav>
        )}
      </div>
    </main>
  );
}
