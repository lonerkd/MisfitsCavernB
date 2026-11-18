import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test as base, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The one e2e helper (BACKLOG 3.37). It picks the backend, makes users, signs
// them in through /auth, and remembers everything it made so teardown deletes
// it even when a spec fails halfway.
//
//   Local (default):  E2E_LOCAL_STACK=1; the URL and service key come from
//                     `npx supabase status`; the app is served on PLAYWRIGHT_BASE_URL.
//   Staging:          E2E_SUPABASE_URL + E2E_SUPABASE_SERVICE_KEY + E2E_BASE_URL
//                     (the app, e.g. a Vercel preview wired to that project).
//                     Never point these at production.
//
// Usage:  import { test, expect, stackEnabled, stackSkipReason } from './support/stack';
//         test.skip(!stackEnabled, stackSkipReason);
//         test('...', async ({ page, stack }) => { const u = await stack.createUser(); await stack.signIn(page, u); });
// `stack` is worker-scoped, so it works in beforeAll too.

const STAGING = !!(process.env.E2E_SUPABASE_URL && process.env.E2E_SUPABASE_SERVICE_KEY);
export const stackEnabled = STAGING || process.env.E2E_LOCAL_STACK === '1';
export const stackSkipReason =
  'set E2E_LOCAL_STACK=1 (local stack) or E2E_SUPABASE_URL + E2E_SUPABASE_SERVICE_KEY + E2E_BASE_URL (staging)';

/** Marks every account a run creates, so a stray one is recognisable at a glance. */
export const QA_PREFIX = 'qa';
const QA_DOMAIN = 'journey.test';

export interface QaUser { id: string; email: string; password: string; username: string }
export interface CreateUserOptions {
  /** Short label that goes into the email and username. */
  label?: string;
  /** Use this exact email (default: a QA-marked one made from the label). */
  email?: string;
  /** Use this password (default: a fresh one). A spec that signs in with its own constant passes it. */
  password?: string;
  /** Use this username (default: `qa<label><tag><n>`). */
  username?: string;
  /**
   * Flag the profile `is_sample` so `get_platform_stats`, the directory and people search leave it out.
   * Default: on for staging (a shared backend whose numbers matter), off locally (the database is thrown
   * away, and a sample account is hidden from the directory and from people search, which some specs exercise).
   */
  sample?: boolean;
}

function connect(): { url: string; key: string; anon: string; db: string; staging: boolean } {
  if (STAGING) return { url: process.env.E2E_SUPABASE_URL!, key: process.env.E2E_SUPABASE_SERVICE_KEY!, anon: process.env.E2E_SUPABASE_ANON_KEY ?? '', db: process.env.E2E_SUPABASE_DB_URL ?? '', staging: true };
  const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  return { url: s.API_URL, key: s.SERVICE_ROLE_KEY, anon: s.ANON_KEY ?? s.PUBLISHABLE_KEY, db: s.DB_URL, staging: false };
}

/** Sign in through the real /auth form and wait to land somewhere else. Needs no Stack, so a describe-level helper can call it. */
export async function signInAs(page: Page, user: { email: string; password: string }): Promise<void> {
  await page.goto('/auth');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
}

export class Stack {
  readonly admin: SupabaseClient;
  readonly staging: boolean;
  readonly url: string;
  /** The project's public (anon) key: what the app itself signs in with. On staging it is E2E_SUPABASE_ANON_KEY. */
  readonly anonKey: string;
  /** The Postgres connection string, for a spec that must run SQL (locally from `supabase status`; on staging E2E_SUPABASE_DB_URL). Empty when unknown. */
  readonly dbUrl: string;
  /** One tag per run, in every email, username and title the helper makes. */
  readonly tag = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  private users: QaUser[] = [];
  private cleanups: Array<{ name: string; run: () => Promise<unknown> }> = [];
  private n = 0;

  constructor() {
    const c = connect();
    this.url = c.url;
    this.anonKey = c.anon;
    this.dbUrl = c.db;
    this.staging = c.staging;
    this.admin = createClient(c.url, c.key, { auth: { persistSession: false } });
  }

  /** A client with the public key and no session: what a person's browser has before signing in (then `auth.signInWithPassword`). */
  anonClient(): SupabaseClient {
    if (!this.anonKey) throw new Error('no anon key: on staging set E2E_SUPABASE_ANON_KEY');
    return createClient(this.url, this.anonKey, { auth: { persistSession: false } });
  }

  /** Create a confirmed user with a QA-marked email and username and a fresh password. */
  async createUser(opts: CreateUserOptions = {}): Promise<QaUser> {
    const label = (opts.label ?? 'u').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'u';
    const n = this.n++;
    const username = opts.username ?? `${QA_PREFIX}${label}${this.tag}${n}`;
    const user: QaUser = { id: '', email: opts.email ?? `${QA_PREFIX}.${label}.${this.tag}.${n}@${QA_DOMAIN}`, password: opts.password ?? randomUUID(), username };
    const { data, error } = await this.admin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (error || !data.user) throw new Error(`createUser failed: ${error?.message ?? 'no user'}`);
    user.id = data.user.id;
    this.users.push(user);
    if (opts.sample ?? this.staging) await this.markSample(user.id);
    return user;
  }

  /** Flag a profile as sample (service role only: the guard trigger refuses anyone signed in). */
  async markSample(userId: string): Promise<void> {
    for (let i = 0; i < 10; i++) {
      const { data, error } = await this.admin.from('profiles').update({ is_sample: true }).eq('id', userId).select('id');
      if (error) throw new Error(`markSample failed: ${error.message}`);
      if (data?.length) return;
      await new Promise((r) => setTimeout(r, 200)); // the profile row is made by a trigger
    }
    throw new Error(`markSample: no profile row for ${userId}`);
  }

  /** Remember a cleanup for teardown (run in reverse order, before the users are deleted). */
  onCleanup(name: string, run: () => Promise<unknown>): void {
    this.cleanups.push({ name, run });
  }

  /** Insert a row and delete it at teardown. Returns the inserted row. */
  async insert<T extends { id: string } = { id: string }>(table: string, row: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.admin.from(table).insert(row).select('*').single();
    if (error) throw new Error(`insert into ${table} failed: ${error.message}`);
    const id = (data as { id: string }).id;
    this.onCleanup(`${table} ${id}`, async () => { await this.admin.from(table).delete().eq('id', id); });
    return data as unknown as T;
  }

  /** A project owned by `owner`, removed at teardown. */
  async createProject(owner: QaUser, fields: Record<string, unknown> = {}): Promise<{ id: string }> {
    return this.insert('projects', { title: `QA ${this.tag}`, creator_id: owner.id, ...fields });
  }

  /** Sign in through the real /auth form and wait to land somewhere else. */
  async signIn(page: Page, user: { email: string; password: string }): Promise<void> {
    await signInAs(page, user);
  }

  /** Delete everything this run made. Never throws; says what it could not remove. */
  async cleanup(): Promise<string[]> {
    const failed: string[] = [];
    for (const c of [...this.cleanups].reverse()) {
      try { await c.run(); } catch (e) { failed.push(`${c.name}: ${(e as Error).message}`); }
    }
    this.cleanups = [];
    for (const u of this.users) {
      try {
        const { error } = await this.admin.auth.admin.deleteUser(u.id);
        if (error) failed.push(`user ${u.email}: ${error.message}`);
      } catch (e) { failed.push(`user ${u.email}: ${(e as Error).message}`); }
    }
    this.users = [];
    if (failed.length) console.warn(`[e2e stack] cleanup left behind:\n  ${failed.join('\n  ')}`);
    return failed;
  }
}

export const test = base.extend<object, { stack: Stack }>({
  stack: [
    async ({}, provide) => {
      const stack = new Stack();
      try { await provide(stack); } finally { await stack.cleanup(); }
    },
    { scope: 'worker' },
  ],
});

export { expect };
