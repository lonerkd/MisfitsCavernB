import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Browser } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// An admin suspends a member from /admin/users: the member cannot sign in any
// more (and the page says so, in words), nothing of theirs is deleted, and
// lifting it lets them in again. Admins have no suspend button. Opt-in:
// E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe.serial('Suspending an account (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const users: Record<'boss' | 'member', { id: string; email: string; name: string }> = {} as never;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const k of ['boss', 'member'] as const) {
      const email = `su${k}.${TAG}@journey.test`;
      const name = `su${k}${TAG}`;
      const { data } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: name } });
      users[k] = { id: data.user!.id, email, name };
    }
    await admin.from('profiles').update({ is_admin: true }).eq('id', users.boss.id);
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('audit_logs').delete().eq('resource_id', users.member.id);
    for (const u of Object.values(users)) await admin.auth.admin.deleteUser(u.id);
  });

  const signIn = async (browser: Browser, email: string) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/auth');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    return { ctx, page };
  };

  test('the admin suspends a member, who then cannot sign in', async ({ browser }) => {
    test.setTimeout(150_000);
    const boss = await signIn(browser, users.boss.email);
    await boss.page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    await boss.page.goto('/admin/users');
    await expect(boss.page.getByRole('button', { name: `Suspend ${users.member.name}` })).toBeVisible({ timeout: 30_000 });
    await expect(boss.page.getByRole('button', { name: `Suspend ${users.boss.name}` })).toHaveCount(0); // no button on an admin
    await boss.page.getByRole('button', { name: `Suspend ${users.member.name}` }).click();
    await boss.page.getByRole('button', { name: 'Suspend', exact: true }).click();
    await expect(boss.page.getByText(`${users.member.name} is suspended`)).toBeVisible({ timeout: 20_000 });
    await expect(boss.page.getByText('Suspended', { exact: true })).toBeVisible();
    expect((await admin.from('audit_logs').select('action').eq('resource_id', users.member.id)).data).toEqual([{ action: 'admin_suspend_user' }]);

    // The member cannot get in.
    const member = await signIn(browser, users.member.email);
    await expect(member.page).toHaveURL(/\/auth/, { timeout: 15_000 });
    await expect(member.page.getByText(/This account has been suspended/)).toBeVisible({ timeout: 15_000 });
    await expect(member.page).toHaveURL(/\/auth/);
    await member.ctx.close();
    await boss.ctx.close();
  });

  test('lifting it lets them in again', async ({ browser }) => {
    test.setTimeout(150_000);
    const boss = await signIn(browser, users.boss.email);
    await boss.page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    await boss.page.goto('/admin/users');
    await boss.page.getByRole('button', { name: `Lift suspension for ${users.member.name}` }).click({ timeout: 30_000 });
    await expect(boss.page.getByText(`${users.member.name} can sign in again`)).toBeVisible({ timeout: 20_000 });
    await boss.ctx.close();

    const member = await signIn(browser, users.member.email);
    await member.page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    await member.ctx.close();
  });
});
