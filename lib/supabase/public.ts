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
  cover_url: string | null;
}

/** What a shared portfolio's link preview needs, by share token; null when there is none (or the read fails). */
export async function getPortfolioPreview(db: PublicClient | null, token: string): Promise<PortfolioPreview | null> {
  if (!db || !token) return null;
  const { data, error } = await db.rpc('get_shared_portfolio', { p_token: token });
  if (error || !data) return null;
  const d = data as { title: string; description: string | null; year: number | null; role: string | null; cover_url?: string | null; profiles?: { username: string | null } | null; portfolio_media?: PortfolioPreview['portfolio_media'] };
  return {
    title: d.title,
    description: d.description,
    year: d.year,
    role: d.role,
    profiles: d.profiles ?? null,
    portfolio_media: d.portfolio_media ?? [],
    cover_url: d.cover_url ?? null,
  };
}

export interface PortfolioPagePiece {
  title: string; year: number | null; role: string | null; category: string | null; description: string | null;
  cover_url: string | null; accent_color: string | null; share_token: string;
}
export interface PortfolioPageCredit {
  title: string; year: number | null; project_type: string | null; accent_color: string | null; share_token: string;
  kind: string; credit: string; character_name: string | null;
}
export interface PortfolioPageData {
  page: 'unlisted' | 'public';
  profile: { username: string | null; role: string | null; location: string | null; bio: string | null; avatar_url: string | null; status: string | null };
  pieces: PortfolioPagePiece[];
  /** The public films they are credited on (the creator, confirmed crew, cast), one row per credit. */
  credits: PortfolioPageCredit[];
}

/** A person's page by handle (their username), for the public /u/<handle> page; null when there is none or it is off. */
export async function getPortfolioPage(db: PublicClient | null, handle: string): Promise<PortfolioPageData | null> {
  if (!db || !handle.trim()) return null;
  const { data, error } = await db.rpc('get_portfolio_page', { p_handle: handle });
  if (error || !data) return null;
  const d = data as Partial<PortfolioPageData>;
  if (!d.profile || (d.page !== 'public' && d.page !== 'unlisted')) return null;
  return { page: d.page, profile: d.profile, pieces: Array.isArray(d.pieces) ? d.pieces : [], credits: Array.isArray(d.credits) ? d.credits : [] };
}

export interface PublicPortfolioCard {
  username: string; role: string | null; location: string | null; bio: string | null; avatar_url: string | null;
  status: string | null; pieces: number; cover_url: string | null;
}

/** People whose portfolio page is public, for the public directory; empty when there is no client or the read fails. */
export async function listPublicPortfolios(db: PublicClient | null, opts: { q?: string; limit: number; offset: number }): Promise<PublicPortfolioCard[]> {
  if (!db) return [];
  const { data, error } = await db.rpc('list_public_portfolios', { p_query: opts.q || undefined, p_limit: opts.limit, p_offset: opts.offset });
  if (error || !Array.isArray(data)) return [];
  return data as PublicPortfolioCard[];
}

/** The crafts people can be found by (reference data anyone may read), in the order the suite shows them; empty on no client or a failed read. */
export async function listCraftNames(db: PublicClient | null): Promise<string[]> {
  if (!db) return [];
  const { data, error } = await db.from('crafts').select('name').order('position');
  if (error || !Array.isArray(data)) return [];
  return data.map((c) => c.name);
}
