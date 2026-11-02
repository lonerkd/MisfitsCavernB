import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, chromium } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The film graph: a shoot day's date is the day's own. A day dated on the schedule with no call sheet yet is a
// dated day in Readiness (it used to read "no date", because Readiness looked only at call sheets).
// Real data, no mocks. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const SCRIPT = 'INT. KITCHEN - DAY\n\nMAYA stirs a pot.\n';

test.describe('Readiness reads a day’s own date (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId = '';
  let projectId = '';
  const email = `daydate.${TAG}@journey.test`;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    userId = (await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `daydate${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Daydate ${TAG}`, creator_id: userId, status: 'pre-production' }).select('id').single()).data!.id;
    await admin.from('scripts').insert({ title: 'Kitchen', content: SCRIPT, project_id: projectId, created_by: userId, last_edited_by: userId });
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  test('a day dated on the schedule, with no call sheet, is dated in Readiness', async () => {
    test.setTimeout(120_000);
    const browser = await chromium.launch({ executablePath: process.env.MC_LOCAL_CHROMIUM });
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await ctx.newPage();
    try {
      await page.goto('/auth');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', PASSWORD);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
      await page.goto('/studio?tab=production&view=readiness');
      const picker = page.getByLabel('Active project');
      await picker.waitFor();
      if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);

      let sceneId = '';
      await expect.poll(async () => {
        sceneId = (await admin.from('scenes').select('id').eq('project_id', projectId).is('removed_at', null).limit(1)).data?.[0]?.id ?? '';
        return sceneId;
      }, { timeout: 30_000 }).not.toBe('');
      await admin.from('scenes').update({ shoot_day: 1 }).eq('id', sceneId);
      await expect(page.getByText('no date', { exact: true }).first()).toBeVisible({ timeout: 30_000 });

      // Dated on the schedule (the day's own row); there is no call sheet.
      await admin.from('shoot_days').update({ shoot_date: '2026-12-21' }).eq('project_id', projectId).eq('day_number', 1);
      expect((await admin.from('call_sheets').select('id').eq('project_id', projectId)).data).toEqual([]);
      await expect(page.getByText('Mon, Dec 21').first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('no date', { exact: true })).toHaveCount(0);
    } finally { await ctx.close(); await browser.close(); }
  });
});
