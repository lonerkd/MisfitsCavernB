import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Browser } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The community Lounge against a local stack: everyone sees the site-wide
// channels; an admin can add one, a member can't. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Community Lounge (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const users: Record<'boss' | 'member', { id: string; email: string }> = {} as never;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const k of ['boss', 'member'] as const) {
      const email = `cm${k}.${TAG}@journey.test`;
      const { data } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `${k}${TAG}` } });
      users[k] = { id: data.user!.id, email };
    }
    await admin.from('profiles').update({ is_admin: true }).eq('id', users.boss.id);
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('channels').delete().is('project_id', null).eq('name', `screenwriting-${TAG}`);
    await admin.from('messages').delete().like('content', `%${TAG}%`);
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
    await page.goto('/lounge');
    return { ctx, page };
  };

  test('everyone sees the community channels; only an admin adds one', async ({ browser }) => {
    test.setTimeout(120_000);
    const member = await signIn(browser, users.member.email);
    await expect(member.page.getByRole('button', { name: 'craft-talk' })).toBeVisible({ timeout: 20_000 });
    await expect(member.page.getByRole('button', { name: 'the-lounge' })).toBeVisible();
    await expect(member.page.getByRole('button', { name: 'start-here' })).toBeVisible();
    await expect(member.page.getByRole('button', { name: 'admins', exact: true })).toHaveCount(0);
    await expect(member.page.getByRole('button', { name: 'New community channel' })).toHaveCount(0);
    await member.ctx.close();

    const boss = await signIn(browser, users.boss.email);
    await boss.page.getByRole('button', { name: 'New community channel' }).click({ timeout: 20_000 });
    await expect(boss.page.getByText('Community · everyone on Misfits Cavern')).toBeVisible();
    await expect(boss.page.getByRole('button', { name: 'admins', exact: true })).toBeVisible();
    await boss.page.getByLabel('Name').fill(`screenwriting ${TAG}`);
    const who = boss.page.getByRole('radiogroup', { name: 'Who it’s for' });
    await expect(who.getByRole('radio')).toHaveCount(2);
    await who.getByRole('radio', { name: /^Admins/ }).click();
    await boss.page.getByRole('button', { name: 'CREATE' }).click();
    await expect(boss.page.getByRole('button', { name: `screenwriting-${TAG}` })).toBeVisible({ timeout: 10_000 });
    await expect.poll(async () => (await admin.from('channels').select('project_id, created_by, audience').eq('name', `screenwriting-${TAG}`).maybeSingle()).data)
      .toMatchObject({ project_id: null, created_by: users.boss.id, audience: 'admins' });
    await boss.ctx.close();
  });

  test('a guide reads as sections: whoever runs it writes, everyone else only reads', async ({ browser }) => {
    test.setTimeout(120_000);
    const heading = `How do I start a project? ${TAG}`;
    const boss = await signIn(browser, users.boss.email);
    await boss.page.getByRole('button', { name: 'faq' }).click({ timeout: 20_000 });
    await expect(boss.page.getByText('GUIDE', { exact: true })).toBeVisible();
    const box = boss.page.getByPlaceholder(/Add a section to faq/);
    await box.fill(`${heading}\nOpen Projects, pick a format and the suite unlocks its tools phase by phase.`);
    await boss.page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(boss.page.getByRole('heading', { name: heading })).toBeVisible({ timeout: 10_000 });
    await boss.ctx.close();

    const member = await signIn(browser, users.member.email);
    await member.page.getByRole('button', { name: 'faq' }).click({ timeout: 20_000 });
    await expect(member.page.getByRole('heading', { name: heading })).toBeVisible({ timeout: 10_000 });
    await expect(member.page.getByText('the suite unlocks its tools phase by phase')).toBeVisible();
    await expect(member.page.getByRole('textbox')).toHaveCount(0);
    await expect(member.page.getByRole('button', { name: /^Remove section/ })).toHaveCount(0);
    await member.ctx.close();

    const again = await signIn(browser, users.boss.email);
    await again.page.getByRole('button', { name: 'faq' }).click({ timeout: 20_000 });
    await again.page.getByRole('button', { name: `Remove section: ${heading}` }).click();
    await again.page.getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(again.page.getByRole('heading', { name: heading })).toHaveCount(0);
    await expect.poll(async () => (await admin.from('messages').select('id').eq('content', `${heading}\nOpen Projects, pick a format and the suite unlocks its tools phase by phase.`)).data?.length).toBe(0);
    await again.ctx.close();
  });
});
