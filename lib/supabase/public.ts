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
