import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Browser } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// A reported message: the admin reads it in the queue, hides it, the channel then
// reads a notice instead of the words, and the admin brings it back.
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36).replace(/[0-9]/g, (d) => 'abcdefghij'[+d]);
const WORDS = `Send me money first ${TAG}`;
const CHANNEL = `hidetest-${TAG}`;

test.describe.serial('Hiding a reported message (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const users: Record<'boss' | 'poster' | 'member', { id: string; email: string }> = {} as never;
  let channelId = '';
  let messageId = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const k of ['boss', 'poster', 'member'] as const) {
      const email = `hm${k}.${TAG}@journey.test`;
      const { data } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `${k}${TAG}` } });
      users[k] = { id: data.user!.id, email };
    }
    await admin.from('profiles').update({ is_admin: true }).eq('id', users.boss.id);
    channelId = (await admin.from('channels').insert({ name: CHANNEL, project_id: null, type: 'text', audience: 'users', post_policy: 'viewers', created_by: users.boss.id }).select('id').single()).data!.id;
    messageId = (await admin.from('messages').insert({ sender_id: users.poster.id, channel_uuid: channelId, content: WORDS }).select('id').single()).data!.id;
    const rep = await admin.from('reports').insert({ reporter_id: users.member.id, kind: 'message', target_id: messageId, reason: 'Scam' });
    expect(rep.error).toBeNull();
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('audit_logs').delete().eq('resource_id', messageId);
    await admin.from('reports').delete().eq('target_id', messageId);
    await admin.from('channels').delete().eq('id', channelId);
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

  test('the admin reads it in the queue and hides it; the channel reads a notice', async ({ browser }) => {
    test.setTimeout(150_000);
    const boss = await signIn(browser, users.boss.email);
    await boss.page.goto('/admin/reports');
    await expect(boss.page.getByText(WORDS)).toBeVisible({ timeout: 30_000 });
    await boss.page.getByRole('button', { name: 'Hide the message' }).click();
    await boss.page.getByRole('button', { name: 'Hide it', exact: true }).click();
    await expect(boss.page.getByText('Hidden from everyone.')).toBeVisible({ timeout: 20_000 });
    expect((await admin.from('messages').select('content').eq('id', messageId).single()).data?.content).toBe('[Removed by an admin]');
    await expect(boss.page.getByText(WORDS)).toBeVisible(); // the admin still reads the original

    const member = await signIn(browser, users.member.email);
    await member.page.goto('/lounge');
    await member.page.getByRole('button', { name: CHANNEL, exact: true }).click({ timeout: 30_000 });
    await expect(member.page.getByText('[Removed by an admin]')).toBeVisible({ timeout: 20_000 });
    await expect(member.page.getByText(WORDS)).toHaveCount(0);
    await member.ctx.close();
    await boss.ctx.close();
  });

  test('the admin brings it back', async ({ browser }) => {
    test.setTimeout(120_000);
    const boss = await signIn(browser, users.boss.email);
    await boss.page.goto('/admin/reports');
    await boss.page.getByRole('button', { name: 'Bring it back' }).click({ timeout: 30_000 });
    await expect(boss.page.getByText('Visible to the channel.')).toBeVisible({ timeout: 20_000 });
    expect((await admin.from('messages').select('content, hidden_at').eq('id', messageId).single()).data).toEqual({ content: WORDS, hidden_at: null });
    await boss.ctx.close();
  });
});
