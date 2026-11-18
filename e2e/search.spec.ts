import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

// Suite-wide search in a real browser against a local stack: it finds a line
// written inside a script and opens it in the editor, and finds a location
// and opens Studio › Locations on its project. Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const WORD = `zephyr${TAG}`;
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

async function axeViolations(page: Page, selector: string): Promise<string[]> {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async (sel) => {
    const r = await (window as any).axe.run(sel, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)}`).join(' | ')}`);
  }, selector);
}

test.describe('Suite-wide search (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  const owner = { id: '', email: `search-owner.${TAG}@journey.test` };
  let projectId: string;
  let scriptId: string;

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    owner.id = (await stack.createUser({ email: owner.email, password: PASSWORD, username: `searcher${TAG}` })).id;
    projectId = (await admin.from('projects').insert({ title: `Tidewater ${TAG}`, creator_id: owner.id, status: 'pre-production' }).select('id').single()).data!.id;
    scriptId = (await admin.from('scripts').insert({
      title: 'Tidewater', project_id: projectId, created_by: owner.id, last_edited_by: owner.id,
      content: `INT. BOATHOUSE - NIGHT\n\nA ${WORD} wind rattles the doors.\n`,
    }).select('id').single()).data!.id;
    await admin.from('project_locations').insert({ project_id: projectId, name: `LIGHTHOUSE ${TAG.toUpperCase()}` });
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
  });

  test('Search finds words inside a script and a location, and opens them', async ({ page }) => {
    test.setTimeout(120_000);
    await signInAs(page, { email: owner.email, password: PASSWORD });
    await page.goto('/projects');

    // A word written in the script, found by its start. The island's search
    // button opens the palette (Caps Lock, then /): reach for the island, then click it.
    const openSearch = async () => {
      await page.locator('[data-taskbar] .mc-taskbar').hover({ timeout: 30_000 });
      await page.getByRole('button', { name: 'Search (Caps Lock, then slash)' }).click({ timeout: 30_000 });
    };
    await openSearch();
    const palette = page.getByRole('dialog', { name: 'Search the suite' });
    await palette.getByRole('textbox', { name: 'Search the suite' }).fill(WORD.slice(0, -2));
    const script = palette.getByRole('button', { name: /^Tidewater/ }).filter({ hasText: `Script · Tidewater ${TAG}` });
    await expect(script).toContainText(`${WORD} wind rattles`, { timeout: 15_000 });
    const violations = await axeViolations(page, '[role="dialog"][aria-label="Search the suite"]');
    expect(violations, violations.join('\n')).toEqual([]);
    await script.click();
    await page.waitForURL(new RegExp(`/editor\\?script=${scriptId}`));

    // A location opens Studio › Locations on its project.
    await openSearch();
    await palette.getByRole('textbox', { name: 'Search the suite' }).fill(`lighthouse ${TAG}`);
    await palette.getByRole('button', { name: new RegExp(`LIGHTHOUSE ${TAG.toUpperCase()}`) }).click({ timeout: 15_000 });
    await page.waitForURL(/\/studio\?tab=production&view=locations/);
    await expect(page.getByLabel('Active project')).toHaveValue(projectId, { timeout: 30_000 });
    // ...and its card, not just the list: the hit carries the place's id.
    await expect(page.getByRole('dialog', { name: /^Location:/ })).toBeVisible({ timeout: 15_000 });
  });
});
