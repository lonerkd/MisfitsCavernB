import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { Browser } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

// An admin adds a craft without a deploy and everyone then sees it (here, as a
// choice a member can make on their profile list); removing it is confirmed. A
// member is turned away from the page, and the database refuses their write.
// Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const CRAFT = `Dolly grip ${TAG}`;

test.describe.serial('Admin crafts (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  const users: Record<'boss' | 'member', { id: string; email: string }> = {} as never;

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    for (const k of ['boss', 'member'] as const) {
      const email = `ac${k}.${TAG}@journey.test`;
      const data = await stack.createUser({ email, password: PASSWORD, username: `${k}${TAG}` });
      users[k] = { id: data.id, email };
    }
    await admin.from('profiles').update({ is_admin: true }).eq('id', users.boss.id);
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('crafts').delete().eq('name', CRAFT);
    for (const u of Object.values(users)) await admin.auth.admin.deleteUser(u.id);
  });

  const signIn = async (browser: Browser, email: string) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await signInAs(page, { email: email, password: PASSWORD });
    return { ctx, page };
  };

  test('an admin adds a craft and removes it', async ({ browser }) => {
    test.setTimeout(120_000);
    const boss = await signIn(browser, users.boss.email);
    await boss.page.goto('/admin/crafts');
    const form = boss.page.getByRole('form', { name: 'Add a craft' });
    await expect(form).toBeVisible({ timeout: 30_000 });
    const name = form.getByLabel('Name');
    // The fields are controlled: hold the fill until the page has hydrated.
    await expect(async () => { await name.fill(CRAFT); await expect(name).toHaveValue(CRAFT, { timeout: 1000 }); }).toPass({ timeout: 20_000 });
    await form.getByLabel('Department').fill('Camera');
    await form.getByRole('button', { name: 'Add craft' }).click();
    await expect(boss.page.getByText(`Added ${CRAFT}`)).toBeVisible({ timeout: 20_000 });
    await expect(boss.page.getByRole('region', { name: 'Camera' }).getByText(CRAFT)).toBeVisible();
    expect((await admin.from('crafts').select('name, department, position').eq('name', CRAFT).single()).data).toMatchObject({ name: CRAFT, department: 'Camera' });

    // The same name again is refused, in words.
    await expect(async () => { await name.fill(CRAFT); await expect(name).toHaveValue(CRAFT, { timeout: 1000 }); }).toPass({ timeout: 10_000 });
    await form.getByRole('button', { name: 'Add craft' }).click();
    await expect(boss.page.getByText(`“${CRAFT}” is already a craft.`)).toBeVisible();

    await boss.page.getByRole('button', { name: `Remove ${CRAFT}` }).click();
    await boss.page.getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(boss.page.getByText(`Removed ${CRAFT}`)).toBeVisible({ timeout: 20_000 });
    expect((await admin.from('crafts').select('name').eq('name', CRAFT)).data).toEqual([]);
    await boss.ctx.close();
  });

  test('a member is turned away, and the database refuses their write', async ({ browser, stack }) => {
    test.setTimeout(120_000);
    const member = await signIn(browser, users.member.email);
    await member.page.goto('/admin/crafts');
    await expect(member.page.getByRole('form', { name: 'Add a craft' })).toHaveCount(0);
    await member.ctx.close();

    const asMember = stack.anonClient();
    await asMember.auth.signInWithPassword({ email: users.member.email, password: PASSWORD });
    const { error } = await asMember.from('crafts').insert({ name: `Sneaky ${TAG}`, department: 'Camera', color: '#ffffff', position: 999 });
    expect(error).not.toBeNull();
  });
});
