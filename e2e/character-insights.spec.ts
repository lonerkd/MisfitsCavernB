import { readFileSync } from 'node:fs';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { Page } from '@playwright/test';

// BACKLOG 4.8 slices 1 and 3: what the script says about its characters, in the Studio's Character bible. A name spelled two ways and a
// one-line character are warned about with a jump to the line (and can be dismissed on this device); the relationship list ranks who talks
// to whom; the bible prints through the print kit. Opt-in: E2E_LOCAL_STACK=1.
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const SCRIPT = [
  'INT. FERRY - NIGHT', '',
  'MAYA (30s) stands at the rail. LUIS (40s) lights a cigarette.', '',
  'MAYA', 'Do you remember the harbour?', '',
  'LUIS', 'Every winter.', '',
  'MAYA', 'Then you remember the key.', '',
  'LUIS', 'I lost it years ago.', '',
  'EXT. DOCK - DAWN', '',
  'MAYA and LUIS walk off.', '',
  'MAYA', 'It is cold.', '',
  'LUIS', 'It always is.', '',
  'DOCK WORKER', 'Hey!', '',
  'INT. OFFICE - DAY', '',
  'MAYAH', 'Where is everyone?', '',
  'LUIS', 'Gone.', '',
].join('\n');

async function axe(page: Page, scope: string) {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async ([sel]) => {
    const r = await (window as any).axe.run(document.querySelector(sel), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 2).map((n: any) => `${n.target.join(' ')} ${n.any?.[0]?.message ?? ''}`).join(' | ')}`);
  }, [scope]) as Promise<string[]>;
}

test.describe('Character insights (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  test('warnings with a jump, the relationship list, the diagram and the bible PDF', async ({ page, stack }) => {
    test.setTimeout(150_000);
    const sam = await stack.createUser({ label: 'insight' });
    const project = await stack.createProject(sam, { title: `Insight ${stack.tag}`, status: 'pre-production' });
    const script = (await stack.insert('scripts', { title: 'Ferry', content: SCRIPT, project_id: project.id, created_by: sam.id, last_edited_by: sam.id })).id;
    await signInAs(page, sam);
    await page.setViewportSize({ width: 1400, height: 1000 });
    await page.goto('/studio?tab=production&view=story');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== project.id) await picker.selectOption(project.id);

    const insights = page.getByTestId('character-insights');
    await expect(insights).toBeVisible({ timeout: 30_000 });

    // Who talks to whom: the pair is first, with its turns and scenes.
    const first = page.getByTestId('relationship-row').first();
    await expect(first).toContainText('LUIS');
    await expect(first).toContainText('MAYA');
    await expect(page.getByTestId('relationship-diagram')).toBeVisible();
    await page.getByRole('button', { name: /^MAYA: talks most to LUIS/ }).click();
    await expect(page.getByRole('status').filter({ hasText: 'MAYA talks to LUIS' })).toBeVisible();

    // The warnings: a name spelled two ways, one line only.
    const spelling = page.locator('[data-testid="character-warning"][data-rule="spelling"]');
    await expect(spelling).toContainText('MAYAH and MAYA look like one character spelled two ways');
    await expect(page.locator('[data-testid="character-warning"][data-rule="single-line"]').filter({ hasText: 'DOCK WORKER has exactly one line' })).toHaveCount(1);

    await page.screenshot({ path: '/tmp/pw-out/insights-1400.png', fullPage: true });
    expect(await axe(page, '[data-testid="character-insights"]')).toEqual([]);

    // The bible as a PDF: the print kit opens a document with the characters in it.
    await page.evaluate(() => {
      const w = window as unknown as { __printed: string[] };
      w.__printed = [];
      new MutationObserver((records) => { for (const r of records) for (const n of Array.from(r.addedNodes)) if (n instanceof HTMLIFrameElement && n.srcdoc) w.__printed.push(n.srcdoc); }).observe(document.body, { childList: true });
    });
    await page.getByRole('button', { name: 'Print / PDF: the character bible' }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __printed: string[] }).__printed.join('\n'))).toContain('Character bible');
    const printed = await page.evaluate(() => (window as unknown as { __printed: string[] }).__printed.join('\n'));
    for (const s of ['MAYA', 'LUIS', 'DOCK WORKER', 'MAYAH and MAYA look like one character spelled two ways', 'Talks to most']) expect(printed).toContain(s);

    // A phone: the list first, the diagram scrolls inside its own box, the page does not scroll sideways.
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(insights).toBeVisible();
    await insights.scrollIntoViewIfNeeded();
    await page.screenshot({ path: '/tmp/pw-out/insights-390.png', fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.setViewportSize({ width: 1400, height: 1000 });

    // The jump: the editor opens on the line.
    await spelling.getByRole('button', { name: /Open in the editor, line/ }).click();
    await page.waitForURL(/\/editor\?script=.*&line=\d+/);
    const editor = page.getByRole('textbox', { name: 'Script', exact: true });
    await expect(editor).toHaveValue(SCRIPT, { timeout: 30_000 });
    const lineOffset = SCRIPT.split('\n').slice(0, SCRIPT.split('\n').indexOf('MAYAH')).join('\n').length + 1;
    await expect.poll(() => editor.evaluate((el: HTMLTextAreaElement) => el.selectionStart), { timeout: 10_000 }).toBe(lineOffset);

    // A dismissal is kept on this device.
    await page.goto('/studio?tab=production&view=story');
    await expect(spelling).toBeVisible({ timeout: 30_000 });
    await spelling.getByRole('button', { name: /^It is on purpose:/ }).click();
    await expect(page.getByText(/Dismissed · 1/)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Dismissed · 1/)).toBeVisible({ timeout: 30_000 });
    expect(script).toBeTruthy();
  });

  test('an outsider sees none of it', async ({ page, stack }) => {
    test.setTimeout(90_000);
    const sam = await stack.createUser({ label: 'insowner' });
    const riley = await stack.createUser({ label: 'insriley' });
    const project = await stack.createProject(sam, { title: `Private ${stack.tag}`, status: 'pre-production' });
    await stack.insert('scripts', { title: 'Ferry', content: SCRIPT, project_id: project.id, created_by: sam.id, last_edited_by: sam.id });
    await signInAs(page, riley);
    await page.goto('/studio?tab=production&view=story');
    await page.waitForTimeout(4000);
    await expect(page.getByTestId('character-insights')).toHaveCount(0);
    await expect(page.getByText('DOCK WORKER')).toHaveCount(0);
  });
});
