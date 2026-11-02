import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, chromium } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// What a scene and a shoot day cost, read from the breakdown (BACKLOG 4.6 slice 1), in a real browser. A lamp used
// in both scenes is paid once, so it is split; a coat is in one scene only. Real data, no mocks.
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const SCRIPT = 'INT. KITCHEN - DAY\n\nMAYA stirs a pot.\n\nINT. GARAGE - NIGHT\n\nBEN sorts tools.\n';

test.describe('Cost by scene and day (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId = '';
  let projectId = '';
  const email = `cost.${TAG}@journey.test`;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    userId = (await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `cost${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Cost ${TAG}`, creator_id: userId, status: 'pre-production' }).select('id').single()).data!.id;
    await admin.from('scripts').insert({ title: 'Kitchen', content: SCRIPT, project_id: projectId, created_by: userId, last_edited_by: userId });
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  test('the Money tab shows each scene’s cost, a shared lamp split, and each day’s total', async () => {
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
      await page.goto('/studio?tab=production&view=money');
      const picker = page.getByLabel('Active project');
      await picker.waitFor();
      if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);

      // The Studio reads the script into scenes on opening; then the breakdown and the schedule are filled in.
      let scenes: Array<{ id: string; ordinal: number | null }> = [];
      await expect.poll(async () => {
        scenes = ((await admin.from('scenes').select('id, ordinal').eq('project_id', projectId).order('ordinal')).data ?? []) as typeof scenes;
        return scenes.length;
      }, { timeout: 30_000 }).toBe(2);
      // Every project starts with the usual categories; wardrobe gets a default unit cost of $40.
      const catId = async (key: string) => (await admin.from('breakdown_categories').select('id').eq('project_id', projectId).eq('key', key).single()).data!.id as string;
      const props = await catId('props');
      const wardrobe = await catId('wardrobe');
      await admin.from('breakdown_categories').update({ unit_cost: 40 }).eq('id', wardrobe);
      const mk = async (name: string, category: string, cost: number | null) => (await admin.from('breakdown_elements').insert({ project_id: projectId, category_id: category, name, cost, created_by: userId }).select('id').single()).data!.id as string;
      const lamp = await mk('Work lamp', props, 100);
      const coat = await mk('Apron', wardrobe, null); // no figure entered: the category's $40 default
      await admin.from('scene_elements').insert([
        { scene_id: scenes[0].id, element_id: lamp, project_id: projectId },
        { scene_id: scenes[1].id, element_id: lamp, project_id: projectId },
        { scene_id: scenes[0].id, element_id: coat, project_id: projectId },
      ]);
      await admin.from('scenes').update({ shoot_day: 1 }).eq('id', scenes[0].id);
      await admin.from('scenes').update({ shoot_day: 2 }).eq('id', scenes[1].id);

      const section = page.getByRole('region', { name: /Cost by scene and day/ });
      await expect(section.getByRole('rowheader', { name: /Day 1/ })).toBeVisible({ timeout: 30_000 });
      // Day 1: the coat ($40) + half the lamp ($50); Day 2: the other half of the lamp.
      await expect(section.getByRole('row', { name: /Day 1/ })).toContainText('$90');
      await expect(section.getByRole('row', { name: /Day 2/ })).toContainText('$50');
      await expect(section.getByRole('row', { name: /KITCHEN/ })).toContainText('incl. $50 shared');
      await expect(section.getByRole('row', { name: /Day 1/ })).toContainText('$40 is a default estimate');
      await expect(section).toContainText('Project total $140');
      if (process.env.COST_SHOT) await section.screenshot({ path: process.env.COST_SHOT });
    } finally { await ctx.close(); await browser.close(); }
  });
});
