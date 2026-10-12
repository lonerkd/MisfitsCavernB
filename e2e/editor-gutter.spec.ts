import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The film graph reaches the editor: each scene heading has its story day and
// time (read from the script, or set) and, once scheduled, its shoot day, in
// the left margin. Read only — it never changes the script.
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const SCRIPT = 'INT. KITCHEN - NIGHT\n\nMAYA\nStill up.\n\nINT. KITCHEN - NEXT MORNING\n\nMAYA\nCoffee.\n';

test.describe('Editor gutter (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const me = { id: '', email: `gut.${TAG}@journey.test` };
  let projectId = '';
  let scriptId = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    me.id = (await admin.auth.admin.createUser({ email: me.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `gut${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Gutter ${TAG}`, creator_id: me.id }).select('id').single()).data!.id;
    scriptId = (await admin.from('scripts').insert({ title: 'Kitchen', content: SCRIPT, project_id: projectId, created_by: me.id, last_edited_by: me.id }).select('id').single()).data!.id;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('created_by', me.id);
    await admin.from('projects').delete().eq('id', projectId);
    if (me.id) await admin.auth.admin.deleteUser(me.id);
  });

  test('story time and shoot day sit beside the headings, and the script is untouched', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('/auth');
    await page.fill('input[name="email"]', me.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    await page.goto('/studio');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);

    await page.goto(`/editor?script=${scriptId}`);
    const script = page.getByLabel('Script', { exact: true });
    await expect(script).toHaveValue(SCRIPT, { timeout: 30_000 });

    // Read from the headings: a morning after a night is the next story day.
    await expect(page.getByRole('note', { name: 'story day 1, night (read from the script)' })).toBeVisible();
    await expect(page.getByRole('note', { name: 'story day 2, morning (read from the script)' })).toBeVisible();

    // The card for the scene being written says the same, for a screen too narrow for the margin.
    await expect(page.getByText('Day 1 · night', { exact: true })).toBeVisible();

    // Every scene starts on day 1; that alone isn't a schedule, so no shoot day is shown.
    await expect(page.getByRole('note', { name: /shoot day/ })).toHaveCount(0);

    // Put the second scene on day 3 (the scene index has synced by now): still no date, still no shoot day.
    await expect.poll(async () => (await admin.from('scenes').select('id').eq('script_id', scriptId)).data?.length ?? 0, { timeout: 30_000 }).toBe(2);
    const second = (await admin.from('scenes').select('id, heading').eq('script_id', scriptId).order('ordinal')).data![1];
    await admin.from('scenes').update({ shoot_day: 3 }).eq('id', second.id);
    await expect.poll(async () => (await admin.from('shoot_days').select('id').eq('project_id', projectId).eq('day_number', 3)).data?.length ?? 0).toBe(1);
    await expect(page.getByRole('note', { name: /shoot day/ })).toHaveCount(0);

    // Date the day: now it is scheduled, and the shoot day appears.
    await admin.from('shoot_days').update({ shoot_date: '2026-11-03' }).eq('project_id', projectId).eq('day_number', 3);
    await expect(page.getByRole('note', { name: 'story day 2, morning, shoot day 3 (read from the script)' })).toBeVisible({ timeout: 30_000 });

    // A person's setting wins over the reading, and loses the "read from the script".
    await admin.from('scenes').update({ story_day: 7, story_time: 'dawn', story_confirmed: true }).eq('id', second.id);
    await expect(page.getByRole('note', { name: 'story day 7, dawn, shoot day 3' })).toBeVisible({ timeout: 30_000 });

    // Read only: nothing it shows ended up in the script.
    await expect(script).toHaveValue(SCRIPT);
    expect((await admin.from('scripts').select('content').eq('id', scriptId).single()).data!.content).toBe(SCRIPT);
  });

  test('the cue card shows who plays the character and their look, only while the caret is on the cue', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('/auth');
    await page.fill('input[name="email"]', me.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    await page.goto('/studio');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);

    // The scene index (and so MAYA, from the cast list) exists once the editor has synced it.
    await page.goto(`/editor?script=${scriptId}`);
    const script = page.getByLabel('Script', { exact: true });
    await expect(script).toHaveValue(SCRIPT, { timeout: 30_000 });
    await expect.poll(async () => (await admin.from('characters').select('id').eq('project_id', projectId).eq('name', 'MAYA')).data?.length ?? 0, { timeout: 30_000 }).toBe(1);
    const maya = (await admin.from('characters').select('id').eq('project_id', projectId).eq('name', 'MAYA').single()).data!;
    const first = (await admin.from('scenes').select('id').eq('script_id', scriptId).order('ordinal')).data![0];
    await admin.from('character_castings').insert({ project_id: projectId, character_name: 'MAYA', crew_user_id: me.id });
    await admin.from('scene_states').insert({ project_id: projectId, scene_id: first.id, character_id: maya.id, look: 'Red coat' });

    // Caret on the heading: no card. Caret on MAYA's cue: the card.
    await page.reload();
    await expect(script).toHaveValue(SCRIPT, { timeout: 30_000 });
    await script.click();
    await page.keyboard.press('Control+Home');
    await expect(page.getByRole('note', { name: /^MAYA, played by/ })).toHaveCount(0);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('note', { name: /^MAYA, played by gut.+, look in this scene: Red coat/ })).toBeVisible({ timeout: 15_000 });

    // Moved onto her dialogue, the card goes; the script was never touched.
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('note', { name: /^MAYA, played by/ })).toHaveCount(0);
    await expect(script).toHaveValue(SCRIPT);
  });
});
