import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { Browser } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

// The community Lounge against a local stack: everyone sees the site-wide
// channels; an admin can add one, a member can't. Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Community Lounge (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  const users: Record<'boss' | 'member', { id: string; email: string }> = {} as never;

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    for (const k of ['boss', 'member'] as const) {
      const email = `cm${k}.${TAG}@journey.test`;
      const data = await stack.createUser({ email, password: PASSWORD, username: `${k}${TAG}` });
      users[k] = { id: data.id, email };
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
    await signInAs(page, { email: email, password: PASSWORD });
    await page.goto('/lounge');
    return { ctx, page };
  };

  test('everyone sees the community channels; only an admin adds one', async ({ browser }) => {
    test.setTimeout(120_000);
    const member = await signIn(browser, users.member.email);
    await expect(member.page.getByRole('button', { name: 'craft-talk' })).toBeVisible({ timeout: 20_000 });
    await expect(member.page.getByRole('button', { name: 'the-lounge' })).toBeVisible();
    // Guides live in the hub's Learn now: the Lounge has no guide channels (L6).
    for (const g of ['start-here', 'faq', 'tutorials']) await expect(member.page.getByRole('button', { name: g, exact: true })).toHaveCount(0);
    await expect(member.page.getByRole('button', { name: 'admins', exact: true })).toHaveCount(0);
    await expect(member.page.getByRole('button', { name: 'New community channel' })).toHaveCount(0);
    await member.ctx.close();

    const boss = await signIn(browser, users.boss.email);
    await boss.page.getByRole('button', { name: 'New community channel' }).click({ timeout: 20_000 });
    await expect(boss.page.getByText('Community · everyone on The Cavern')).toBeVisible();
    await expect(boss.page.getByRole('button', { name: 'admins', exact: true })).toBeVisible();
    await boss.page.getByLabel('Name').fill(`screenwriting ${TAG}`);
    const who = boss.page.getByRole('radiogroup', { name: 'Who it’s for' });
    await expect(who.getByRole('radio')).toHaveCount(2);
    await who.getByRole('radio', { name: /^Admins/ }).click();
    await boss.page.getByRole('button', { name: 'CREATE' }).click();
    await expect(boss.page.getByRole('button', { name: `screenwriting-${TAG}`, exact: true })).toBeVisible({ timeout: 10_000 });
    await expect.poll(async () => (await admin.from('channels').select('project_id, created_by, audience').eq('name', `screenwriting-${TAG}`).maybeSingle()).data)
      .toMatchObject({ project_id: null, created_by: users.boss.id, audience: 'admins' });
    await boss.ctx.close();
  });

  test('the Lounge holds no guide channels (guides live in Learn)', async ({ browser }) => {
    test.setTimeout(120_000);
    const member = await signIn(browser, users.member.email);
    await expect(member.page.getByRole('button', { name: 'craft-talk' })).toBeVisible({ timeout: 20_000 });
    for (const g of ['start-here', 'faq', 'tutorials']) await expect(member.page.getByRole('button', { name: g, exact: true })).toHaveCount(0);
    expect((await admin.from('channels').select('id').eq('type', 'guide')).data).toEqual([]);
    await member.ctx.close();
  });
});
