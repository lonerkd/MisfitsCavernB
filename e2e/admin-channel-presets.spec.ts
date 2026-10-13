import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Browser } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// An admin adds a channel suggestion without a deploy, a duplicate is refused in
// words, removing it is confirmed; a member is turned away and the database
// refuses their write. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36).replace(/[0-9]/g, (d) => 'abcdefghij'[+d]);
const KEY = `stunt-${TAG}`;

test.describe.serial('Admin channel suggestions (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const users: Record<'boss' | 'member', { id: string; email: string }> = {} as never;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const k of ['boss', 'member'] as const) {
      const email = `cp${k}.${TAG}@journey.test`;
      const { data } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `${k}${TAG}` } });
      users[k] = { id: data.user!.id, email };
    }
    await admin.from('profiles').update({ is_admin: true }).eq('id', users.boss.id);
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('channel_presets').delete().eq('key', KEY);
    for (const u of Object.values(users)) await admin.auth.admin.deleteUser(u.id);
  });

  const signIn = async (browser: Browser, email: string) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/auth');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    return { ctx, page };
  };

  test('an admin adds a suggestion, is refused a duplicate, and removes it', async ({ browser }) => {
    test.setTimeout(120_000);
    const boss = await signIn(browser, users.boss.email);
    await boss.page.goto('/admin/channel-presets');
    const form = boss.page.getByRole('form', { name: 'Add a suggestion' });
    await expect(form).toBeVisible({ timeout: 30_000 });
    const fill = async (name: string, why: string) => {
      const n = form.getByLabel('Name');
      await expect(async () => { await n.fill(name); await expect(n).toHaveValue(name, { timeout: 1000 }); }).toPass({ timeout: 20_000 });
      await form.getByLabel('Why a production wants it').fill(why);
    };
    await fill(`Stunt ${TAG}`, 'Safety plans for the stunt team.');
    await form.getByLabel('Phase').selectOption('production');
    await form.getByRole('button', { name: 'Add suggestion' }).click();
    await expect(boss.page.getByText(`Added #${KEY}`)).toBeVisible({ timeout: 20_000 });
    await expect(boss.page.getByRole('region', { name: 'production' }).getByText(`#${KEY}`)).toBeVisible();
    expect((await admin.from('channel_presets').select('key, phase, post_policy, why').eq('key', KEY).single()).data).toEqual({ key: KEY, phase: 'production', post_policy: 'viewers', why: 'Safety plans for the stunt team.' });

    await fill(`Stunt ${TAG}`, 'Again.');
    await form.getByRole('button', { name: 'Add suggestion' }).click();
    await expect(boss.page.getByText(`There is already a suggestion called “${KEY}”.`)).toBeVisible();

    await boss.page.getByRole('button', { name: `Remove #${KEY}` }).click();
    await boss.page.getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(boss.page.getByText(`Removed #${KEY}`)).toBeVisible({ timeout: 20_000 });
    expect((await admin.from('channel_presets').select('key').eq('key', KEY)).data).toEqual([]);
    await boss.ctx.close();
  });

  test('a member is turned away, and the database refuses their write', async ({ browser }) => {
    test.setTimeout(120_000);
    const member = await signIn(browser, users.member.email);
    await member.page.goto('/admin/channel-presets');
    await expect(member.page.getByRole('form', { name: 'Add a suggestion' })).toHaveCount(0);
    await member.ctx.close();

    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    const asMember = createClient(s.API_URL, s.ANON_KEY, { auth: { persistSession: false } });
    await asMember.auth.signInWithPassword({ email: users.member.email, password: PASSWORD });
    const { error } = await asMember.from('channel_presets').insert({ key: `sneaky-${TAG}`, name: `sneaky-${TAG}`, type: 'text', audience: 'team', post_policy: 'viewers', phase: 'production', why: 'x', position: 999 });
    expect(error).not.toBeNull();
  });
});
