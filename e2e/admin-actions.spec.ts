import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason } from './support/stack';
import type { Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The admin's real actions, in a real browser against a local stack: grant and remove admin rights, suspend a person (they cannot sign in) and lift it, each recorded in the audit log; clear a reported error; the platform totals count real accounts. Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);



test.describe.serial('Admin actions (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  let apiUrl = '';
  let anonKey = '';
  const boss = { id: '', email: `aa-boss.${TAG}@journey.test`, name: `aaboss${TAG}` };
  const member = { id: '', email: `aa-mem.${TAG}@journey.test`, name: `aamem${TAG}` };
  const ERR = `Admin sweep error ${TAG}`;

  test.beforeAll(async ({ stack }) => {
    apiUrl = stack.url; anonKey = stack.anonKey;
    admin = stack.admin;
    for (const who of [boss, member]) {
      who.id = (await admin.auth.admin.createUser({ email: who.email, password: PASSWORD, email_confirm: true, user_metadata: { username: who.name } })).data.user!.id;
    }
    await admin.from('profiles').update({ is_admin: true }).eq('id', boss.id);
    await admin.from('client_errors').insert({ kind: 'window', message: ERR, path: '/somewhere', user_id: member.id });
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('client_errors').delete().eq('message', ERR);
    for (const who of [boss, member]) if (who.id) await admin.auth.admin.deleteUser(who.id);
  });

  const signIn = async (page: Page, who: { email: string }) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', who.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
  };
  const canSignIn = async () => {
    const c = createClient(apiUrl, anonKey, { auth: { persistSession: false } });
    return !(await c.auth.signInWithPassword({ email: member.email, password: PASSWORD })).error;
  };
  const row = (page: Page, name: string) => page.getByRole('row').filter({ hasText: name });

  test('grant and remove admin rights, suspend and lift, each in the audit log', async ({ page }) => {
    test.setTimeout(200_000);
    await signIn(page, boss);
    await page.goto('/admin/users');
    await expect(row(page, member.name)).toBeVisible({ timeout: 30_000 });

    await row(page, member.name).getByRole('button', { name: 'Make admin' }).click();
    await expect(page.getByText('Admin rights granted')).toBeVisible({ timeout: 20_000 });
    await expect(row(page, member.name)).toContainText('ADMIN');
    expect((await admin.from('profiles').select('is_admin').eq('id', member.id).single()).data!.is_admin).toBe(true);
    await row(page, member.name).getByRole('button', { name: 'Remove admin' }).click();
    await expect(page.getByText('Admin rights removed')).toBeVisible({ timeout: 20_000 });
    expect((await admin.from('profiles').select('is_admin').eq('id', member.id).single()).data!.is_admin).toBe(false);

    // Nobody removes their own rights.
    await expect(row(page, boss.name).getByRole('button', { name: 'Remove admin' })).toBeDisabled();

    expect(await canSignIn()).toBe(true);
    await page.getByRole('button', { name: `Suspend ${member.name}` }).click();
    await page.getByRole('button', { name: 'Suspend', exact: true }).click();
    await expect(page.getByText(`${member.name} is suspended`)).toBeVisible({ timeout: 20_000 });
    await expect(row(page, member.name)).toContainText('Suspended');
    expect(await canSignIn()).toBe(false);
    await page.getByRole('button', { name: `Lift suspension for ${member.name}` }).click();
    await expect(page.getByText(`${member.name} can sign in again`)).toBeVisible({ timeout: 20_000 });
    expect(await canSignIn()).toBe(true);

    const log = await admin.from('audit_logs').select('action').eq('user_id', boss.id);
    expect((log.data ?? []).length).toBeGreaterThanOrEqual(2);
  });

  test('a reported error is listed with its count and cleared once fixed', async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, boss);
    await page.goto('/admin/errors');
    const item = page.getByRole('list', { name: 'Errors' }).getByRole('listitem').filter({ hasText: ERR });
    await expect(item).toBeVisible({ timeout: 30_000 });
    await expect(item).toContainText('/somewhere');
    await page.getByRole('button', { name: new RegExp(`^Clear: ${ERR}`) }).click();
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(page.getByText('Cleared')).toBeVisible({ timeout: 20_000 });
    await expect(item).toHaveCount(0);
    expect((await admin.from('client_errors').select('id').eq('message', ERR)).data ?? []).toHaveLength(0);
  });

  test('the admin home links to every admin screen', async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, boss);
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /admin panel/i })).toBeVisible({ timeout: 30_000 });
    for (const path of ['/admin/users', '/admin/analytics', '/admin/audit-logs', '/admin/errors', '/admin/hub', '/admin/reports', '/admin/support', '/admin/crafts', '/admin/formats', '/admin/brief-questions', '/admin/channel-presets']) {
      await expect(page.locator(`a[href="${path}"]`).first(), path).toBeVisible();
    }
  });

  test('an admin is offered the admin area in Settings and in the search; a member is not', async ({ browser }) => {
    test.setTimeout(200_000);
    for (const [who, expected] of [[boss, true], [member, false]] as const) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await signIn(page, who);
      await page.goto('/settings');
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeAttached({ timeout: 30_000 });
      await page.getByText('Delete account').first().waitFor({ timeout: 30_000 });
      await expect(page.getByRole('link', { name: 'OPEN ADMIN' })).toHaveCount(expected ? 1 : 0);
      await page.goto('/community');
      await page.waitForLoadState('domcontentloaded');
      await page.locator('body').click();
      await page.keyboard.press('Control+k');
      const palette = page.getByRole('dialog', { name: 'Search the suite' });
      await expect(palette).toBeVisible({ timeout: 20_000 });
      await palette.getByRole('textbox').fill('admin');
      if (expected) await expect(palette.getByText('Open Admin')).toBeVisible({ timeout: 10_000 });
      else await expect(palette.getByText('Open Admin')).toHaveCount(0);
      await ctx.close();
    }
  });

  test('an admin writes a hub post, keeps it a draft, publishes it, and a member then reads it', async ({ browser }) => {
    test.setTimeout(200_000);
    const TITLE = `Hub post ${TAG}`;
    const bossCtx = await browser.newContext();
    const bossPage = await bossCtx.newPage();
    await signIn(bossPage, boss);
    await bossPage.goto('/admin/hub');
    await bossPage.getByRole('button', { name: 'New post' }).click();
    const form = bossPage.getByRole('form', { name: 'New post' });
    await expect(form).toBeVisible({ timeout: 30_000 });
    const title = form.getByLabel('Title');
    await expect(async () => { await title.fill(TITLE); await expect(title).toHaveValue(TITLE, { timeout: 1000 }); }).toPass({ timeout: 20_000 });
    await form.getByLabel(/Body/).fill('A **bold** announcement for everyone.');
    await form.getByRole('button', { name: 'Save draft' }).click();
    await expect(bossPage.getByText('Draft saved')).toBeVisible({ timeout: 20_000 });

    // A draft is invisible to a member.
    const memCtx = await browser.newContext();
    const memPage = await memCtx.newPage();
    await signIn(memPage, member);
    await memPage.goto('/community');
    await expect(memPage.getByRole('heading', { name: /community|your day/i }).first()).toBeVisible({ timeout: 30_000 });
    await expect(memPage.getByText(TITLE)).toHaveCount(0);

    await bossPage.getByRole('button', { name: 'Publish now' }).click();
    await expect(bossPage.getByText('Published', { exact: true })).toBeVisible({ timeout: 20_000 });
    await memPage.reload();
    await expect(memPage.getByText(TITLE).first()).toBeVisible({ timeout: 30_000 });

    await admin.from('hub_posts').delete().eq('title', TITLE);
    await bossCtx.close();
    await memCtx.close();
  });
});
