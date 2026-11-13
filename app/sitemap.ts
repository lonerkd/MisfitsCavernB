import type { MetadataRoute } from 'next';
import { publicClient, listPublicPortfolios } from '@/lib/supabase/public';
import { portfolioSitemap } from '@/lib/portfolio/sitemap';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = publicClient();
  return portfolioSitemap(process.env.NEXT_PUBLIC_APP_URL || 'https://misfits-cavern-b.vercel.app', (o) => listPublicPortfolios(db, o));
}
