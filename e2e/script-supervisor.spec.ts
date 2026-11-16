import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The director's day at a glance, in a real browser against a local stack: a Direction craft sees the next shoot day's scenes, the
// shots planned for each and what still needs them; a gaffer and an outsider see no such card. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

async function axeViolations(page: Page): Promise<string[]> {
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))));
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)}`).join(' | ')}`);
  });
}


test.describe('Script supervisor: lined script and selected takes (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const owner = { id: '', email: `ss-owner.${TAG}@journey.test` };
  let projectId = '';
  const SCRIPT = 'INT. KITCHEN - DAY\n\nMAYA waits by the stove.\n\nMAYA\nYou’re late.\n\nBEN\nTraffic.\n\nMAYA\nSit.\n';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    owner.id = (await admin.auth.admin.createUser({ email: owner.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `ssowner${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Lined ${TAG}`, creator_id: owner.id, status: 'production' }).select('id').single()).data!.id;
    const scriptId = (await admin.from('scripts').insert({ title: 'Lined', content: SCRIPT, project_id: projectId, created_by: owner.id, last_edited_by: owner.id }).select('id').single()).data!.id;
    const sceneId = (await admin.from('scenes').insert({ project_id: projectId, script_id: scriptId, ordinal: 0, scene_number: 1, title: 'INT. KITCHEN - DAY', heading: 'INT. KITCHEN - DAY', location: 'Kitchen', cast_list: 'MAYA, BEN', shoot_day: 1 }).select('id').single()).data!.id;
    await admin.from('shots').insert({ project_id: projectId, scene_id: sceneId, shot_number: '1A', description: 'Wide master' });
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
    if (owner.id) await admin.auth.admin.deleteUser(owner.id);
  });

  const signIn = async (page: Page) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', owner.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
  };

  const log = async (page: Page, take: string, from: string, to: string, opts: { shot?: boolean; circle?: boolean } = {}) => {
    // The scene stays chosen after the first take: link it only the first time.
    if ((await page.getByLabel('Unlink scene 1').count()) === 0) {
      const addScene = page.getByLabel('Scene: add a scene');
      await expect(addScene.locator('option')).not.toHaveCount(1, { timeout: 30_000 });
      await addScene.selectOption({ index: 1 });
    }
    await expect(page.getByLabel('Unlink scene 1')).toBeVisible();
    if (opts.shot) {
      const shot = page.getByLabel('Shot', { exact: true });
      await expect(shot).toBeEnabled({ timeout: 30_000 });
      await shot.selectOption({ index: 1 });
    }
    await page.getByPlaceholder('1A').fill(take);
    await page.getByLabel('From line', { exact: true }).fill(from);
    await page.getByLabel('To line', { exact: true }).fill(to);
    if (opts.circle) await page.getByLabel('Circle', { exact: true }).check();
    await page.getByRole('button', { name: 'Log', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Takes' }).getByText(take, { exact: true })).toBeVisible({ timeout: 20_000 });
  };

  test('log takes with their lines, see the lined script and the lines nothing covers, one selected take per shot', async ({ page }) => {
    test.setTimeout(180_000);
    await signIn(page);
    await page.goto('/studio?tab=production&view=scriptsup');
    const picker = page.getByLabel('Active project');
    await picker.waitFor({ timeout: 30_000 });
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    await expect(page.getByRole('heading', { name: 'Script supervisor' })).toBeVisible({ timeout: 30_000 });

    await log(page, 'T1', '1', '3', { shot: true, circle: true });
    await log(page, 'T2', '1', '3', { shot: true, circle: true });

    // One selected take per shot: logging T2 circled took the selection from T1.
    await expect(page.getByRole('button', { name: 'Circle take T1' })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('button', { name: 'Uncircle take T2' })).toHaveAttribute('aria-pressed', 'true');

    // The lined script: seven numbered lines, bars for the takes that cover them, and the lines no selected take covers.
    const table = page.getByRole('table', { name: /Lined script, scene 1/ });
    await expect(table).toBeVisible({ timeout: 30_000 });
    await expect(table.getByText('Traffic.')).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Not covered by a selected take' })).toContainText('lines 4–7');
    await expect(table.getByLabel('Take T2 covers line 3')).toBeVisible();
    await expect(table.getByLabel('Take T1 covers line 3')).toBeVisible();

    // A take for the rest of the scene, no shot, off camera: every line is now covered.
    await page.getByLabel('Off camera').check();
    await log(page, 'T3', '4', '7', { circle: true });
    await expect(page.getByRole('status').filter({ hasText: 'Every line is covered by a selected take.' })).toBeVisible();
    await expect(table.getByLabel(/Take T3 covers line 5, off camera/)).toBeVisible();

    // What the editor should use, by scene and shot.
    const picks = page.getByRole('list', { name: 'Selected takes' });
    await expect(picks).toContainText('Scene 1');
    await expect(picks).toContainText('1A: take T2');
    await expect(picks).toContainText('No shot linked: take T3');
    await expect(picks).not.toContainText('take T1');

    // It survives a reload (the takes are real records).
    await page.reload();
    await picker.waitFor({ timeout: 30_000 });
    await expect(page.getByRole('list', { name: 'Takes' }).getByText('T3', { exact: true })).toBeVisible({ timeout: 30_000 });
    expect(await axeViolations(page)).toEqual([]);
  });
});
