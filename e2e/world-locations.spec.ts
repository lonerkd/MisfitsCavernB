import { readFileSync } from 'node:fs';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { Page } from '@playwright/test';

// BACKLOG 4.11 slice 1: the Locations view says where each place appears in the script (scene, INT/EXT, time, story day, shoot day, pages)
// with a jump to the scene, offers the places scenes name that have no record, warns across places (a spelling variant, a shoot within
// two weeks at a place that is not locked down, a blank cost), and prints a world bible. Opt-in: E2E_LOCAL_STACK=1.
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const SCRIPT = [
  'INT. DOCK OFFICE - NIGHT', '',
  'Maya counts the tickets.', '',
  'EXT. THE DOCK OFFICE - DAY', '',
  'Luis waits by the door.', '',
  'INT. LIGHTHOUSE - DAY', '',
  'The lamp turns.', '',
  'INT. LIGHTHOUSE - NIGHT (1964)', '',
  'An old keeper winds the clock.', '',
  'EXT. FERRY TERMINAL - DAWN', '',
  'The ferry comes in.', '',
].join('\n');

const local = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return local(d); };

async function axe(page: Page, scope: string) {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async ([sel]) => {
    const r = await (window as any).axe.run(document.querySelector(sel), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 2).map((n: any) => `${n.target.join(' ')} ${n.any?.[0]?.message ?? ''}`).join(' | ')}`);
  }, [scope]) as Promise<string[]>;
}

test.describe('World: where a place appears and the checks across places (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  test('appearances with a jump, an unlisted place added, the checks, the world bible', async ({ page, stack }) => {
    test.setTimeout(240_000);
    const sam = await stack.createUser({ label: 'world' });
    const project = await stack.createProject(sam, { title: `World ${stack.tag}`, status: 'pre-production' });
    const script = (await stack.insert('scripts', { title: 'Pier', content: SCRIPT, project_id: project.id, created_by: sam.id, last_edited_by: sam.id })).id;
    await signInAs(page, sam);
    await page.setViewportSize({ width: 1400, height: 1000 });
    await page.goto('/studio?tab=production&view=locations');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== project.id) await picker.selectOption(project.id);
    // The studio reads the script into scenes and a record for each place the script names.
    await expect(page.getByRole('button', { name: /^LIGHTHOUSE/ })).toContainText('2 scenes', { timeout: 40_000 });

    // Arrange what only the production knows, with the service role: DOCK OFFICE needs a permit and shoots in five days; the ferry
    // terminal has no record; a cannery is on the list that no scene uses; the lighthouse is shot on days 3 and 4's story.
    const admin = stack.admin;
    const scenes = (await admin.from('scenes').select('id, scene_number').eq('project_id', project.id).order('scene_number')).data!;
    expect(scenes).toHaveLength(5);
    await admin.from('shoot_days').upsert({ project_id: project.id, day_number: 1, shoot_date: inDays(5) }, { onConflict: 'project_id,day_number' });
    await admin.from('scenes').update({ shoot_day: 1 }).eq('id', scenes[0].id);
    await admin.from('scenes').update({ story_day: 1 }).in('id', [scenes[2].id, scenes[3].id]);
    await admin.from('project_locations').update({ permit: 'needed', status: 'scouting' }).eq('project_id', project.id).eq('name', 'DOCK OFFICE');
    await admin.from('project_locations').update({ cost: 250, status: 'confirmed', permit: 'granted' }).eq('project_id', project.id).eq('name', 'LIGHTHOUSE');
    await admin.from('project_locations').insert({ project_id: project.id, name: 'OLD CANNERY', status: 'scouting', permit: 'unknown' });
    const gone = await admin.from('project_locations').delete().eq('project_id', project.id).eq('name', 'FERRY TERMINAL');
    expect(gone.error).toBeNull();

    await page.reload();
    await picker.waitFor();
    if ((await picker.inputValue()) !== project.id) await picker.selectOption(project.id);

    // Where it appears: the scenes at the lighthouse, in order, with what each says.
    await page.getByRole('button', { name: /^LIGHTHOUSE/ }).click({ timeout: 40_000 });
    const lighthouse = page.getByRole('region', { name: 'Where LIGHTHOUSE appears' });
    await expect(lighthouse.getByTestId('appearance')).toHaveCount(2);
    await expect(lighthouse.getByTestId('appearance').nth(0)).toContainText('INT · day · story day 1 · not scheduled');
    await expect(lighthouse.getByTestId('appearance').nth(1)).toContainText('INT · night · story day 1');
    await expect(lighthouse).toContainText('Where it appears · 2 scenes');

    // The dock office is scheduled: its shoot day and date show.
    await page.getByRole('button', { name: /^DOCK OFFICE/ }).first().click();
    const dock = page.getByRole('region', { name: 'Where DOCK OFFICE appears' });
    await expect(dock.getByTestId('appearance')).toHaveCount(1);
    await expect(dock.getByTestId('appearance')).toContainText('shoot day 1');

    // A location no scene uses says so; a place scenes name with no record is offered as an add.
    await expect(page.getByRole('button', { name: /^OLD CANNERY/ })).toContainText('not in the script yet');
    const unlisted = page.getByTestId('unlisted-places');
    await expect(unlisted).toContainText('In the script, not in Locations');
    await expect(unlisted.getByTestId('unlisted-place')).toHaveCount(1);
    await expect(unlisted).toContainText('FERRY TERMINAL');

    // The checks: the two spellings (and not the lighthouse, whose scenes differ only in INT/EXT, time and year), the shoot soon, no cost.
    const insights = page.getByTestId('world-insights');
    await expect(insights).toBeVisible({ timeout: 30_000 });
    const spelling = page.locator('[data-testid="world-warning"][data-rule="spelling"]');
    await expect(spelling).toHaveCount(1);
    await expect(spelling).toContainText('THE DOCK OFFICE and DOCK OFFICE look like one place spelled two ways');
    const soon = page.locator('[data-testid="world-warning"][data-rule="shoots-soon"]');
    await expect(soon).toHaveCount(1);
    await expect(soon).toContainText('DOCK OFFICE shoots in 5 days (day 1), and it is not confirmed and its permit is still needed');
    await expect(page.locator('[data-testid="world-warning"][data-rule="no-cost"]').filter({ hasText: 'DOCK OFFICE has no cost' })).toHaveCount(1);
    await expect(page.locator('[data-testid="world-warning"]').filter({ hasText: 'LIGHTHOUSE' })).toHaveCount(0);

    await page.screenshot({ path: '/tmp/pw-out-world/world-1400.png', fullPage: true });
    expect(await axe(page, '[data-testid="world-insights"]')).toEqual([]);
    expect(await axe(page, '[data-testid="unlisted-places"]')).toEqual([]);

    // The world bible as a PDF: the print kit opens a document with the places, where they appear and the warnings.
    await page.evaluate(() => {
      const w = window as unknown as { __printed: string[] };
      w.__printed = [];
      new MutationObserver((records) => { for (const r of records) for (const n of Array.from(r.addedNodes)) if (n instanceof HTMLIFrameElement && n.srcdoc) w.__printed.push(n.srcdoc); }).observe(document.body, { childList: true });
    });
    await page.getByRole('button', { name: 'Print / PDF: the world bible' }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __printed: string[] }).__printed.join('\n'))).toContain('World bible');
    const printed = await page.evaluate(() => (window as unknown as { __printed: string[] }).__printed.join('\n'));
    for (const s of ['DOCK OFFICE', 'THE DOCK OFFICE', 'LIGHTHOUSE', 'OLD CANNERY', 'Where it appears', 'INT. LIGHTHOUSE - NIGHT', 'look like one place spelled two ways', 'its permit is still needed', 'not in the script yet']) expect(printed).toContain(s);

    // The unlisted place: add it, and it becomes a record in the list.
    await unlisted.getByRole('button', { name: 'Add FERRY TERMINAL as a location' }).click();
    await expect(page.getByTestId('unlisted-places')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^FERRY TERMINAL/ })).toBeVisible();
    await expect.poll(async () => (await admin.from('project_locations').select('name').eq('project_id', project.id).eq('name', 'FERRY TERMINAL')).data?.length).toBe(1);

    // A phone: the list first, nothing scrolls sideways.
    await page.setViewportSize({ width: 390, height: 844 });
    await insights.scrollIntoViewIfNeeded();
    await page.screenshot({ path: '/tmp/pw-out-world/world-390.png', fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.setViewportSize({ width: 1400, height: 1000 });

    // A dismissal is kept on this device.
    await spelling.getByRole('button', { name: /^It is on purpose:/ }).click();
    await expect(page.getByText(/Dismissed · 1/)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Dismissed · 1/)).toBeVisible({ timeout: 40_000 });

    // The jump: the editor opens on the scene.
    await page.getByRole('button', { name: /^LIGHTHOUSE/ }).click({ timeout: 30_000 });
    await page.getByRole('region', { name: 'Where LIGHTHOUSE appears' }).getByRole('button', { name: 'Open scene 4 in the script' }).click();
    await page.waitForURL(new RegExp(`/editor\\?script=${script}&scene=${scenes[3].id}`));
    const editor = page.getByRole('textbox', { name: 'Script', exact: true });
    await expect(editor).toHaveValue(SCRIPT, { timeout: 30_000 });
  });

  test('an outsider sees none of it', async ({ page, stack }) => {
    test.setTimeout(90_000);
    const sam = await stack.createUser({ label: 'worldown' });
    const riley = await stack.createUser({ label: 'worldriley' });
    const project = await stack.createProject(sam, { title: `Private ${stack.tag}`, status: 'pre-production' });
    await stack.insert('scripts', { title: 'Pier', content: SCRIPT, project_id: project.id, created_by: sam.id, last_edited_by: sam.id });
    await signInAs(page, riley);
    await page.goto('/studio?tab=production&view=locations');
    await page.waitForTimeout(4000);
    await expect(page.getByTestId('world-insights')).toHaveCount(0);
    await expect(page.getByText('DOCK OFFICE')).toHaveCount(0);
    await expect(page.getByText('LIGHTHOUSE')).toHaveCount(0);
  });
});
