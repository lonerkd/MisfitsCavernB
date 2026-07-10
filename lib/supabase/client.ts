import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('Missing Supabase environment variables. Using placeholder values for build.');
}

// Cookie-backed browser client (@supabase/ssr) instead of the plain
// localStorage client: the session must live in cookies so middleware.ts can
// actually validate it server-side. Existing localStorage-only sessions are
// not migrated — users sign in once more after this change ships.
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Generated from the live schema — regenerate after schema changes with:
//   npx supabase gen types typescript --project-id fxsryglwpwcqkfjljbrm > lib/supabase/database.types.ts
export type { Database } from './database.types';
