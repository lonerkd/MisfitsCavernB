import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * A session-less anon client for server code that serves public, shareable
 * surfaces (share links, media permalinks). Everything it can read is decided
 * by RLS and the SECURITY DEFINER share RPCs — never by who is signed in.
 */
export function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

type PublicClient = NonNullable<ReturnType<typeof publicClient>>;

export interface PortfolioPreview {
  title: string;
  description: string | null;
  year: number | null;
  role: string | null;
  profiles: { username: string | null } | null;
  portfolio_media: { url: string; thumbnail_url: string | null; media_type: string | null }[];
}

/** What a shared portfolio's link preview needs, by share token; null when there is none (or the read fails). */
export async function getPortfolioPreview(db: PublicClient | null, token: string): Promise<PortfolioPreview | null> {
  if (!db || !token) return null;
  const { data, error } = await db.rpc('get_shared_portfolio', { p_token: token });
  if (error || !data) return null;
  const d = data as { title: string; description: string | null; year: number | null; role: string | null; profiles?: { username: string | null } | null; portfolio_media?: PortfolioPreview['portfolio_media'] };
  return {
    title: d.title,
    description: d.description,
    year: d.year,
    role: d.role,
    profiles: d.profiles ?? null,
    portfolio_media: d.portfolio_media ?? [],
  };
}
