import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Browser } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// An admin adds a project format without a deploy, is refused a duplicate in
// words, and removes it (confirmed); a member is turned away and the database
// refuses their write. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const NAME = `Live Show ${TAG}`;

test.describe.serial('Admin formats (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const users: Record<'boss' | 'member', { id: string; email: string }> = {} as never;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const k of ['boss', 'member'] as const) {
      const email = `fm${k}.${TAG}@journey.test`;
      const { data } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `${k}${TAG}` } });
      users[k] = { id: data.user!.id, email };
    }
    await admin.from('profiles').update({ is_admin: true }).eq('id', users.boss.id);
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('project_formats').delete().eq('name', NAME);
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

  test('an admin adds a format, is refused a duplicate, and removes it', async ({ browser }) => {
    test.setTimeout(120_000);
    const boss = await signIn(browser, users.boss.email);
    await boss.page.goto('/admin/formats');
    const form = boss.page.getByRole('form', { name: 'Add a format' });
    await expect(form).toBeVisible({ timeout: 30_000 });
    const fill = async () => {
      const n = form.getByLabel('Name');
      await expect(async () => { await n.fill(NAME); await expect(n).toHaveValue(NAME, { timeout: 1000 }); }).toPass({ timeout: 20_000 });
    };
    await fill();
    await form.getByLabel('One line').fill('One night, one room.');
    await form.getByLabel('Script format').selectOption('treatment');
    await form.getByLabel('post-production').check();
    await form.getByRole('button', { name: 'Add format' }).click();
    await expect(boss.page.getByText(`Added ${NAME}`)).toBeVisible({ timeout: 20_000 });
    await expect(boss.page.getByRole('list', { name: 'Formats' }).getByText(NAME)).toBeVisible();
    expect((await admin.from('project_formats').select('name, blurb, script_format, skip_phases').eq('name', NAME).single()).data).toEqual({ name: NAME, blurb: 'One night, one room.', script_format: 'treatment', skip_phases: ['post-production'] });

    await fill();
    await form.getByRole('button', { name: 'Add format' }).click();
    await expect(boss.page.getByText(`“${NAME}” is already a format.`)).toBeVisible();

    await boss.page.getByRole('button', { name: `Remove ${NAME}` }).click();
    await boss.page.getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(boss.page.getByText(`Removed ${NAME}`)).toBeVisible({ timeout: 20_000 });
    expect((await admin.from('project_formats').select('name').eq('name', NAME)).data).toEqual([]);
    await boss.ctx.close();
  });

  test('a member is turned away, and the database refuses their write', async ({ browser }) => {
    test.setTimeout(120_000);
    const member = await signIn(browser, users.member.email);
    await member.page.goto('/admin/formats');
    await expect(member.page.getByRole('form', { name: 'Add a format' })).toHaveCount(0);
    await member.ctx.close();

    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    const asMember = createClient(s.API_URL, s.ANON_KEY, { auth: { persistSession: false } });
    await asMember.auth.signInWithPassword({ email: users.member.email, password: PASSWORD });
    const { error } = await asMember.from('project_formats').insert({ name: `Sneaky ${TAG}`, blurb: '', icon: 'film', script_format: 'screenplay', position: 999 });
    expect(error).not.toBeNull();
  });
});
