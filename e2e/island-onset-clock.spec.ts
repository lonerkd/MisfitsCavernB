import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, chromium } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// On a shoot day the island's "On set · Day N" also says where the day is: the phase, the time on set, and what is
// left to the planned wrap (BACKLOG 4.1, On set's day clock). Real browser, real local Supabase, real set log.
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const pad = (n: number) => String(n).padStart(2, '0');
const local = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

test.describe('The island says where the shoot day is (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId = '';
  let projectId = '';
  const email = `onclock.${TAG}@journey.test`;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    userId = (await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `onclock${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Clock ${TAG}`, creator_id: userId, status: 'production' }).select('id').single()).data!.id;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  test('on set today: rolling, hours on set, and time to wrap, then over', async () => {
    test.setTimeout(150_000);
    // Midday-ish so "3 hours ago" and "1 hour from now" are the same calendar day for any run time that matters.
    const now = new Date();
    const callAt = new Date(now.getTime() - 3 * 3600_000);
    const wrapPlan = new Date(now.getTime() + 60 * 60_000);
    test.skip(local(callAt) !== local(now) || local(wrapPlan) !== local(now), 'near midnight the day would straddle two dates');

    const sheet = (await admin.from('call_sheets').insert({ project_id: projectId, shoot_day: 1, shoot_date: local(now), general_call: hhmm(callAt), estimated_wrap: `${hhmm(wrapPlan)}:00` }).select('id').single()).data!.id;
    await admin.from('set_log').insert([
      { project_id: projectId, call_sheet_id: sheet, kind: 'call', at: callAt.toISOString(), created_by: userId },
      { project_id: projectId, call_sheet_id: sheet, kind: 'rolling', at: new Date(now.getTime() - 2 * 3600_000).toISOString(), created_by: userId },
    ]);

    const browser = await chromium.launch({ executablePath: process.env.MC_LOCAL_CHROMIUM });
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    const page = await ctx.newPage();
    try {
      await page.goto('/auth');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', PASSWORD);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
      await page.goto('/studio?tab=production&view=onset');
      const picker = page.getByLabel('Active project');
      await picker.waitFor();
      if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
      await page.goto('/today');

      const island = page.getByRole('navigation', { name: 'Suite' });
      await expect(island.getByRole('link', { name: /^On set · Day 1 · Rolling · 3h( \d\dm)? on set · (\d+h( \d\dm)?|\d+m) to wrap$/ })).toBeVisible({ timeout: 30_000 });

      // The planned wrap passes while the crew is still rolling: it says how far over.
      await admin.from('call_sheets').update({ estimated_wrap: `${hhmm(new Date(now.getTime() - 20 * 60_000))}:00` }).eq('id', sheet);
      await expect(island.getByRole('link', { name: /^On set · Day 1 · Rolling · .* on set · (1\d|2\d)m over$/ })).toBeVisible({ timeout: 75_000 });
    } finally { await ctx.close(); await browser.close(); }
  });

  test('on a 320 px phone the On set pill stays inside the screen', async () => {
    test.setTimeout(120_000);
    // This test makes its own shoot day if the first one did not (it skips itself near midnight, or may run alone).
    const have = (await admin.from('call_sheets').select('id').eq('project_id', projectId)).data ?? [];
    if (!have.length) await admin.from('call_sheets').insert({ project_id: projectId, shoot_day: 1, shoot_date: local(new Date()) });
    const browser = await chromium.launch({ executablePath: process.env.MC_LOCAL_CHROMIUM });
    const ctx = await browser.newContext({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    try {
      await page.goto('/auth');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', PASSWORD);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
      await page.goto('/studio?tab=production&view=onset');
      const picker = page.getByLabel('Active project');
      await picker.waitFor();
      if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
      await page.goto('/today');
      const link = page.locator('[data-mobile-tabbar]').getByRole('link', { name: /^On set · Day 1/ });
      await expect(link).toBeVisible({ timeout: 30_000 });
      await expect.poll(async () => { const b = await link.boundingBox(); return b ? b.x + b.width : 9999; }).toBeLessThanOrEqual(320);
      const capture = await page.locator('[data-mobile-tabbar]').getByRole('button', { name: /Capture/ }).boundingBox();
      expect(capture && capture.x + capture.width).toBeLessThanOrEqual(320);
    } finally { await ctx.close(); await browser.close(); }
  });
});
