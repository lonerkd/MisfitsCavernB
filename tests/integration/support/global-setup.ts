import { execFileSync } from 'node:child_process';

// Integration tests run against a real local Supabase stack built from
// supabase/migrations (`npx supabase start` / `npx supabase db reset`).
// This resolves its URL and keys once, from the CLI, so no test ever needs
// hardcoded credentials — and fails loudly if the stack isn't running.
export default function setup() {
  if (process.env.SUPABASE_TEST_URL && process.env.SUPABASE_TEST_ANON_KEY && process.env.SUPABASE_TEST_SERVICE_KEY) return;

  let status: Record<string, string>;
  try {
    const out = execFileSync('npx', ['supabase', 'status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    status = JSON.parse(out.slice(out.indexOf('{')));
  } catch {
    throw new Error(
      'Local Supabase is not running. Start it with `npx supabase start` (then `npx supabase db reset` to apply migrations).',
    );
  }

  process.env.SUPABASE_TEST_URL = status.API_URL;
  process.env.SUPABASE_TEST_ANON_KEY = status.ANON_KEY;
  process.env.SUPABASE_TEST_SERVICE_KEY = status.SERVICE_ROLE_KEY;
  process.env.SUPABASE_TEST_DB_URL = status.DB_URL;
}
