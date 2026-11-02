import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, chromium } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Ctrl Z outside a text box takes back the last thing done in the tool: here, a scene moved to another shoot day on the
// stripboard, and a scene's status. Real data, no mocks. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const SCRIPT = 'INT. KITCHEN - DAY\n\nMAYA stirs a pot.\n\nINT. GARAGE - NIGHT\n\nBEN sorts tools.\n';

test.describe('Undo outside the editor (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId = '';
  let projectId = '';
  const email = `undo.${TAG}@journey.test`;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    userId = (await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `undo${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Undo ${TAG}`, creator_id: userId, status: 'pre-production' }).select('id').single()).data!.id;
    await admin.from('scripts').insert({ title: 'Kitchen', content: SCRIPT, project_id: projectId, created_by: userId, last_edited_by: userId });
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  test('Ctrl Z puts a moved scene back on its day, and a changed status back', async () => {
    test.setTimeout(120_000);
    const browser = await chromium.launch({ executablePath: process.env.MC_LOCAL_CHROMIUM });
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    const page = await ctx.newPage();
    try {
      await page.goto('/auth');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', PASSWORD);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
      await page.goto('/studio?tab=production&view=schedule');
      const picker = page.getByLabel('Active project');
      await picker.waitFor();
      if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);

      let scenes: Array<{ id: string }> = [];
      await expect.poll(async () => {
        scenes = ((await admin.from('scenes').select('id').eq('project_id', projectId).order('ordinal')).data ?? []) as typeof scenes;
        return scenes.length;
      }, { timeout: 30_000 }).toBe(2);
      await admin.from('scenes').update({ shoot_day: 1, status: 'planned' }).eq('project_id', projectId);
      await page.reload();

      const day = async () => (await admin.from('scenes').select('shoot_day').eq('id', scenes[0].id).single()).data!.shoot_day as number | null;
      const status = async () => (await admin.from('scenes').select('status').eq('id', scenes[0].id).single()).data!.status as string | null;

      // Move scene 1 to day 2 with the keyboard, then take it back.
      const strip = page.getByRole('listitem', { name: /^Scene 1,/ });
      await expect(strip).toBeVisible({ timeout: 30_000 });
      await strip.focus();
      await page.keyboard.press('Alt+ArrowRight');
      await expect.poll(day, { timeout: 15_000 }).toBe(2);
      await page.locator('body').click({ position: { x: 5, y: 5 } });
      await page.keyboard.press('Control+z');
      await expect(page.getByText('Undone: Moved scene 1 to day 2')).toBeVisible({ timeout: 15_000 });
      await expect.poll(day, { timeout: 15_000 }).toBe(1);

      // Change its status, then take that back.
      await page.getByRole('button', { name: /^Scene 1 is planned/ }).click();
      await expect.poll(status, { timeout: 15_000 }).not.toBe('planned');
      await page.locator('body').click({ position: { x: 5, y: 5 } });
      await page.keyboard.press('Control+z');
      await expect.poll(status, { timeout: 15_000 }).toBe('planned');

      // Nothing is left to undo here: the key does nothing and no toast claims otherwise.
      await page.keyboard.press('Control+z');
      await expect(page.getByText(/^Undone:/)).toHaveCount(0);
    } finally {
      await browser.close();
    }
  });
});
