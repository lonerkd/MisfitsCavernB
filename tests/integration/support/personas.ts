import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

// The three testing personas from AGENTS.md, as real accounts on the local
// stack. Each gets its own signed-in client, so every query goes through the
// same path the app uses: PostgREST + Row Level Security, as that user.
//
//   Sam    — project owner, full CRUD
//   Jordan — crew on Sam's project, collaborative access
//   Riley  — signed-in outsider, must see nothing project-scoped
//   anon   — not signed in at all
export type Client = SupabaseClient<Database>;

export interface Persona {
  id: string;
  email: string;
  username: string;
  client: Client;
}

// Throwaway accounts on a local stack: a fresh random password per run.
const PASSWORD = randomUUID();

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set — integration global setup did not run.`);
  return v;
}

function newClient(key: string): Client {
  return createClient<Database>(env('SUPABASE_TEST_URL'), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Service-role client: bypasses RLS. Only for setup/teardown, never for assertions. */
export function adminClient(): Client {
  return newClient(env('SUPABASE_TEST_SERVICE_KEY'));
}

/** A client with no session — what a logged-out visitor gets. */
export function anonClient(): Client {
  return newClient(env('SUPABASE_TEST_ANON_KEY'));
}

/** Create a real user (through GoTrue, so the signup trigger runs) and sign them in. */
export async function createPersona(label: string): Promise<Persona> {
  const unique = `${label}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const email = `${unique}@test.local`;
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { username: unique },
  });
  if (error || !data.user) throw new Error(`createUser(${label}) failed: ${error?.message}`);

  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInError) throw new Error(`signIn(${label}) failed: ${signInError.message}`);

  return { id: data.user.id, email, username: unique, client };
}

export interface Cast {
  sam: Persona;
  jordan: Persona;
  riley: Persona;
}

export async function createCast(): Promise<Cast> {
  const [sam, jordan, riley] = await Promise.all([
    createPersona('sam'),
    createPersona('jordan'),
    createPersona('riley'),
  ]);
  return { sam, jordan, riley };
}

/** Delete test users; their profiles and owned rows go with them via FK cascades. */
export async function destroyCast(cast: Partial<Cast>) {
  const admin = adminClient();
  const ids = Object.values(cast).filter(Boolean).map((p) => (p as Persona).id);
  // scripts.created_by has no cascade; clear authored scripts first.
  if (ids.length) await admin.from('scripts').delete().in('created_by', ids);
  for (const id of ids) await admin.auth.admin.deleteUser(id);
}
