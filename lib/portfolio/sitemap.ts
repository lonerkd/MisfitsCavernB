import type { MetadataRoute } from 'next';
import type { PublicPortfolioCard } from '@/lib/supabase/public';

type Lister = (opts: { limit: number; offset: number }) => Promise<PublicPortfolioCard[]>;
const PAGE = 49; // the directory function's largest page
const MAX = 1000; // a larger directory would need a sitemap index

/** The directory and every person whose page is Public. The database decides who: link-only and off pages are never listed. */
export async function portfolioSitemap(base: string, list: Lister): Promise<MetadataRoute.Sitemap> {
  const root = base.replace(/\/$/, '');
  const entries: MetadataRoute.Sitemap = [{ url: `${root}/portfolios` }];
  for (let offset = 0; offset < MAX; offset += PAGE) {
    const page = await list({ limit: PAGE, offset });
    for (const p of page) entries.push({ url: `${root}/u/${encodeURIComponent(p.username)}` });
    if (page.length < PAGE) break;
  }
  return entries;
}

