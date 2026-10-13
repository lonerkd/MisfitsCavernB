import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Browser } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Moderation: a member flags someone's job; the admin finds it in /admin/reports,
// looks at it, closes it; a second flag from the same person is thanked, not
// duplicated; a member cannot open the queue. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe.serial('Reports (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const users: Record<'boss' | 'poster' | 'member', { id: string; email: string }> = {} as never;
  let jobId = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const k of ['boss', 'poster', 'member'] as const) {
      const email = `rp${k}.${TAG}@journey.test`;
      const { data } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `${k}${TAG}` } });
      users[k] = { id: data.user!.id, email };
    }
    await admin.from('profiles').update({ is_admin: true }).eq('id', users.boss.id);
    const job = await admin.from('jobs').insert({ title: `Free gig ${TAG}`, role: 'Gaffer', created_by: users.poster.id, description: 'Unpaid, send money first.' }).select('id').single();
    expect(job.error).toBeNull();
    jobId = job.data!.id;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('reports').delete().eq('target_id', jobId);
    await admin.from('jobs').delete().eq('id', jobId);
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

  test('a member reports a job; a second report from them is thanked, not duplicated', async ({ browser }) => {
    test.setTimeout(120_000);
    const member = await signIn(browser, users.member.email);
    await member.page.goto('/jobs');
    await member.page.getByRole('button', { name: 'Report this job' }).first().click({ timeout: 30_000 });
    const dialog = member.page.getByRole('dialog', { name: 'Report this job' });
    const reason = dialog.getByLabel(/What is wrong/);
    await expect(async () => { await reason.fill('Asks for money up front'); await expect(reason).toHaveValue('Asks for money up front', { timeout: 1000 }); }).toPass({ timeout: 20_000 });
    await dialog.getByRole('button', { name: 'Send report' }).click();
    await expect(member.page.getByText('Thanks — the admins will look at it.')).toBeVisible({ timeout: 20_000 });
    expect((await admin.from('reports').select('reporter_id, kind, reason, status').eq('target_id', jobId)).data).toEqual([{ reporter_id: users.member.id, kind: 'job', reason: 'Asks for money up front', status: 'open' }]);

    await member.page.getByRole('button', { name: 'Report this job' }).first().click();
    const again = member.page.getByRole('dialog', { name: 'Report this job' }).getByLabel(/What is wrong/);
    await expect(async () => { await again.fill('Still bad'); await expect(again).toHaveValue('Still bad', { timeout: 1000 }); }).toPass({ timeout: 10_000 });
    await member.page.getByRole('button', { name: 'Send report' }).click();
    await expect(member.page.getByText('You have already reported this — the admins have it.')).toBeVisible({ timeout: 20_000 });
    expect((await admin.from('reports').select('id').eq('target_id', jobId)).data).toHaveLength(1);

    // A member has no queue.
    await member.page.goto('/admin/reports');
    await expect(member.page.getByRole('heading', { name: 'Reports' })).toHaveCount(0);
    await member.ctx.close();
  });

  test('the admin sees it, looks at it, and closes it', async ({ browser }) => {
    test.setTimeout(120_000);
    const boss = await signIn(browser, users.boss.email);
    await boss.page.goto('/admin/reports');
    await expect(boss.page.getByRole('heading', { name: 'Reports' })).toBeVisible({ timeout: 30_000 });
    await expect(boss.page.getByText('Asks for money up front')).toBeVisible({ timeout: 20_000 });
    await expect(boss.page.getByText(`reported by member${TAG}`)).toBeVisible();
    await expect(boss.page.getByRole('link', { name: 'Look at it' })).toHaveAttribute('href', `/jobs/${jobId}`);

    await boss.page.getByRole('button', { name: 'Resolved' }).click();
    await expect(boss.page.getByText('Marked resolved')).toBeVisible({ timeout: 20_000 });
    await expect(boss.page.getByText('Asks for money up front')).toHaveCount(0);
    await boss.page.getByRole('tab', { name: 'Resolved' }).click();
    await expect(boss.page.getByText('Asks for money up front')).toBeVisible({ timeout: 20_000 });
    expect((await admin.from('reports').select('status, resolved_by').eq('target_id', jobId).single()).data).toEqual({ status: 'resolved', resolved_by: users.boss.id });
    await boss.ctx.close();
  });
});
