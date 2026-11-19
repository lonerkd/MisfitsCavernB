import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

// The film graph, step 3, in a real browser against a local stack: the story
// day is read from the script and offered, a character's look is written per
// scene, and a look that changes inside one story day is flagged. Opt-in:
// E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const SCRIPT = [
  'INT. KITCHEN - NIGHT', '', 'MAYA', 'Still up.', '',
  'INT. KITCHEN - NEXT MORNING', '', 'MAYA', 'Coffee.', '',
  'EXT. PIER - DAY', '', 'MAYA', 'Boats.', '',
].join('\n');

async function axeViolations(page: Page): Promise<string[]> {
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
    .map((a) => a.finished.catch(() => undefined))));
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)} ${n.any?.[0]?.message ?? ''}`).join(' | ')}`);
  });
}

test.describe.serial('Continuity (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  let userId: string;
  const email = `story.${TAG}@journey.test`;
  let projectId: string;

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    userId = (await stack.createUser({ email, password: PASSWORD, username: `story${TAG}` })).id;
    projectId = (await admin.from('projects').insert({ title: `Story ${TAG}`, creator_id: userId, status: 'pre-production' }).select('id').single()).data!.id;
    await admin.from('scripts').insert({ title: 'Kitchen', content: SCRIPT, project_id: projectId, created_by: userId, last_edited_by: userId });
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
  });

  async function open(page: Page) {
    await signInAs(page, { email: email, password: PASSWORD });
    await page.goto('/studio?tab=production&view=continuity');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
  }

  test('story days are read from the script, looks are written, a change inside a day is flagged', async ({ page }) => {
    test.setTimeout(120_000);
    await open(page);

    // The script says a morning follows a night, so the second scene is on day 2.
    const read = page.getByRole('button', { name: /Read story time from the script/ });
    await expect(read).toBeVisible({ timeout: 30_000 });
    await read.click();
    await expect(page.getByRole('region', { name: 'Story day 1' })).toBeVisible();
    const day2 = page.getByRole('region', { name: 'Story day 2' });
    await expect(day2).toBeVisible();
    await expect(day2.getByText(/NEXT MORNING/)).toBeVisible();

    // Two scenes on day 2, MAYA in both: the same look is fine, a different one is flagged.
    const looks = day2.getByPlaceholder('Look, wardrobe, make-up');
    await expect(looks).toHaveCount(2);
    await looks.nth(0).fill('Red coat');
    await looks.nth(0).blur();
    await looks.nth(1).fill('Red coat');
    await looks.nth(1).blur();
    await expect(page.getByText('Look changes inside one story day')).toHaveCount(0);
    await looks.nth(1).fill('Blue coat');
    await looks.nth(1).blur();
    await expect(page.getByText(/MAYA: scene 2 “Red coat” then scene 3 “Blue coat”, both on day 2\./)).toBeVisible();

    // Saved for real: it survives a reload.
    await page.reload();
    await expect(page.getByRole('region', { name: 'Story day 2' }).getByPlaceholder('Look, wardrobe, make-up').nth(1)).toHaveValue('Blue coat');
    expect(await axeViolations(page)).toEqual([]);
  });

  test('the call sheet warns wardrobe of a look change on its day', async ({ page }) => {
    test.setTimeout(120_000);
    await signInAs(page, { email, password: PASSWORD });
    await page.goto('/studio?tab=production&view=schedule');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    await page.getByRole('button', { name: /^Day 1/ }).click({ timeout: 30_000 });
    // The previous test left MAYA in a red coat in scene 2 and a blue one in scene 3, both on story day 2; every scene is on shoot day 1.
    await expect(page.getByText('Look changes', { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/MAYA: scene 2 “Red coat” then scene 3 “Blue coat”, both on day 2\./)).toBeVisible();
  });

  test('shoot order sits beside story order, and the wardrobe sheet can be printed', async ({ page }) => {
    test.setTimeout(120_000);
    await open(page);
    await expect(page.getByRole('button', { name: /Print \/ PDF: the wardrobe and make-up sheet/ })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /CSV: the wardrobe and make-up sheet/ })).toBeVisible();
    // Every scene says when it is shot (the script has three scenes; none is scheduled in this project).
    await expect(page.getByText(/^(Shoots day \d+|Not scheduled)$/)).toHaveCount(3);
  });
});
