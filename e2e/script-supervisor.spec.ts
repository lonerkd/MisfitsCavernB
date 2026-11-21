import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { linkCast } from './support/cast';

// The director's day at a glance, in a real browser against a local stack: a Direction craft sees the next shoot day's scenes, the
// shots planned for each and what still needs them; a gaffer and an outsider see no such card. Opt-in: E2E_LOCAL_STACK=1.
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
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  const owner = { id: '', email: `ss-owner.${TAG}@journey.test` };
  let projectId = '';
  const SCRIPT = 'INT. KITCHEN - DAY\n\nMAYA waits by the stove.\n\nMAYA\nYou’re late.\n\nBEN\nTraffic.\n\nMAYA\nSit.\n';

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    owner.id = (await stack.createUser({ email: owner.email, password: PASSWORD, username: `ssowner${TAG}` })).id;
    projectId = (await admin.from('projects').insert({ title: `Lined ${TAG}`, creator_id: owner.id, status: 'production' }).select('id').single()).data!.id;
    const scriptId = (await admin.from('scripts').insert({ title: 'Lined', content: SCRIPT, project_id: projectId, created_by: owner.id, last_edited_by: owner.id }).select('id').single()).data!.id;
    const sceneId = (await admin.from('scenes').insert({ project_id: projectId, script_id: scriptId, ordinal: 0, scene_number: 1, title: 'INT. KITCHEN - DAY', heading: 'INT. KITCHEN - DAY', location: 'Kitchen', shoot_day: 1 }).select('id').single()).data!.id;
    await linkCast(admin, projectId, sceneId, ['MAYA', 'BEN']);
    await admin.from('shots').insert({ project_id: projectId, scene_id: sceneId, shot_number: '1A', description: 'Wide master' });
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
  });

  const signIn = async (page: Page) => {
    await signInAs(page, { email: owner.email, password: PASSWORD });
  };

  const log = async (page: Page, take: string, from: string, to: string, opts: { shot?: boolean; circle?: boolean } = {}) => {
    // The scene stays chosen after the first take: link it only the first time. A person who picks a scene and sees it did not stick
    // picks again, so this does too: it retries the pick until the link shows. (A pick made just before the view finished loading
    // was lost under load, and no wait on the link alone can bring it back: it failed even with 30 s. Whether the view should keep
    // a pick made while it loads is open, BACKLOG 3.37.)
    const unlink = page.getByLabel('Unlink scene 1');
    await expect(async () => {
      if (!(await unlink.isVisible())) {
        const addScene = page.getByLabel('Scene: add a scene');
        await expect(addScene.locator('option')).not.toHaveCount(1, { timeout: 10_000 });
        await addScene.selectOption({ index: 1 });
      }
      await expect(unlink).toBeVisible({ timeout: 6_000 });
    }).toPass({ timeout: 60_000 });
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

    // A continuity photo from the library rides on a take: chosen in the form, shown on the take, and kept after a reload.
    const photo = await admin.from('media').insert({ project_id: projectId, kind: 'image', title: 'Slate photo', external_url: 'https://example.com/slate.jpg' });
    expect(photo.error).toBeNull();
    await page.reload();
    await picker.waitFor({ timeout: 30_000 });
    await expect(page.getByLabel(/Continuity photo/).locator('option', { hasText: 'Slate photo' })).toHaveCount(1, { timeout: 30_000 });
    await page.getByLabel(/Continuity photo/).selectOption({ label: 'Slate photo' });
    await log(page, 'T4', '1', '2', { circle: false });
    await expect(page.getByRole('img', { name: 'Continuity photo for take T4: Slate photo' })).toBeVisible({ timeout: 15_000 });

    // It survives a reload (the takes are real records).
    await page.reload();
    await picker.waitFor({ timeout: 30_000 });
    await expect(page.getByRole('list', { name: 'Takes' }).getByText('T3', { exact: true })).toBeVisible({ timeout: 30_000 });
    expect(await axeViolations(page)).toEqual([]);
  });
});
