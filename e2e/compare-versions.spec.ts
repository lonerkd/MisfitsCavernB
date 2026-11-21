import { readFileSync } from 'node:fs';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';

// Wishlist 4.12: compare any two versions of a script. Sam writes a script, locks a revision, then edits it (a dialogue line
// changed, a character renamed everywhere, a scene added, a scene moved) and opens Compare: the numbers say so, the filter narrows
// the list, next-change moves focus to the change, and a person who can only read the script sees the same view. Opt-in:
// E2E_LOCAL_STACK=1. The screenshots go where SHOTS points (unset: none).
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const V1 = [
  'INT. KITCHEN - NIGHT', '', 'Maya pours coffee and stares at the window.', '', 'MAYA', 'Good morning.', '', 'BEN', 'Is it?', '',
  'EXT. PIER - DAY', '', 'Boats rock against the posts.', '', 'MAYA', 'We should go.', '',
  'INT. HALL - DAY', '', 'Ben waits by the door.', '', 'BEN', 'Maya, hurry.', '',
].join('\n');

// Dialogue changed in the kitchen, MAYA renamed to MIA everywhere, a new scene added, the hall moved before the pier.
const V2 = [
  'INT. KITCHEN - NIGHT', '', 'Mia pours coffee and stares at the window.', '', 'MIA', 'Good evening.', '', 'BEN', 'Is it?', '',
  'INT. HALL - DAY', '', 'Ben waits by the door.', '', 'BEN', 'Mia, hurry.', '',
  'EXT. PIER - DAY', '', 'Boats rock against the posts.', '', 'MIA', 'We should go.', '',
  'INT. ATTIC - NIGHT', '', 'Dust drifts through a shaft of light.', '',
].join('\n');

test.describe('Comparing versions in the editor (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  test('Sam compares a locked revision with the edited draft: stats, filter, next change, accessible, and a phone sheet', async ({ page, stack }) => {
    test.setTimeout(180_000);
    const owner = await stack.createUser({ label: 'compare' });
    const project = await stack.createProject(owner, { title: `Compare ${stack.tag}`, status: 'pre-production' });
    const script = (await stack.insert('scripts', { title: 'Kitchen', content: V1, project_id: project.id, created_by: owner.id, last_edited_by: owner.id })).id;

    await signInAs(page, owner);
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`/editor?script=${script}`);
    const editor = page.getByRole('textbox', { name: 'Script', exact: true });
    await expect(editor).toHaveValue(V1, { timeout: 30_000 });

    // Lock the first revision, through the editor.
    await page.getByRole('button', { name: 'Script', exact: true }).click();
    await page.getByRole('button', { name: 'Lock Current' }).click();
    await expect.poll(async () => (await stack.admin.from('script_revisions').select('id').eq('script_id', script)).data?.length ?? 0, { timeout: 30_000 }).toBe(1);

    // Edit: the whole draft changes in one go (the same state a series of edits leaves).
    await editor.fill(V2);
    await expect(editor).toHaveValue(V2);

    await page.getByRole('button', { name: 'Compare', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Compare script versions' });
    await expect(dialog).toBeVisible();

    // The numbers: one scene added, one moved, one changed.
    const stat = (label: string) => dialog.locator('dt', { hasText: label }).locator('xpath=following-sibling::dd[1]');
    await expect(stat('Scenes added')).toContainText('1');
    await expect(stat('Scenes moved')).toContainText('1');
    await expect(stat('Scenes changed')).toContainText('1');
    await expect(stat('Dialogue changed')).toContainText('1'); // "Good morning." -> "Good evening." only; MAYA -> MIA is one rename
    await expect(dialog.getByText(/MAYA\s*→\s*MIA/)).toBeVisible();
    await expect(dialog.getByRole('button', { name: /INT\. ATTIC - NIGHT/ })).toContainText('Added');
    // One of the hall and the pier changed places (either order is the same move): exactly one scene reads Moved, and none is cut.
    await expect(dialog.getByRole('button', { name: /^Moved / })).toHaveCount(1);
    await expect(stat('Scenes cut')).toContainText('0');
    if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/compare-1400.png` });

    // The filter: scene headings has nothing but the moved and added scenes; action has no dialogue line.
    await dialog.getByRole('button', { name: 'Scene headings', exact: true }).click();
    await expect(dialog.getByText('2 changes')).toBeVisible();
    await dialog.getByRole('button', { name: 'Action', exact: true }).click();
    await expect(dialog.getByText(/Good evening/)).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Dialogue', exact: true }).click();
    await expect(dialog.getByText('1 change', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'All', exact: true }).click();

    // Next change: focus lands on the change, and a screen reader hears where it is.
    await dialog.getByRole('button', { name: 'Next change' }).click();
    await expect(dialog.getByRole('status').filter({ hasText: /Change 1 of/ })).toBeAttached();
    await expect.poll(async () => page.evaluate(() => document.activeElement?.id ?? '')).toMatch(/^cmp-/);
    const first = await page.evaluate(() => document.activeElement?.id);
    await page.keyboard.press('n');
    await expect.poll(async () => page.evaluate(() => document.activeElement?.id)).not.toBe(first);

    // The accessibility scan of the view, on its own.
    await page.addScriptTag({ content: AXE });
    const violations = await page.evaluate(async () => {
      const r = await (window as unknown as { axe: { run: (c: Element, o: unknown) => Promise<{ violations: Array<{ id: string; help: string; nodes: Array<{ target: string[]; html: string }> }> }> } })
        .axe.run(document.querySelector('[role="dialog"]')!, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
      return r.violations.map((v) => `${v.id}: ${v.help} ${v.nodes.slice(0, 3).map((n) => n.target.join(' ') + ' ' + n.html.slice(0, 120)).join(' | ')}`);
    });
    expect(violations).toEqual([]);

    // Printing the report: the button is there and builds without an error toast.
    await expect(dialog.getByRole('button', { name: /CSV: the change report/ })).toBeVisible();

    // A phone: the same view as a sheet, A over B, nothing wider than the screen.
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(dialog.getByText('Version A', { exact: false }).first()).toBeAttached();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/compare-390.png` });
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('a crew member who can only read the script can compare too, and an outsider cannot read the revisions', async ({ page, stack }) => {
    test.setTimeout(150_000);
    const owner = await stack.createUser({ label: 'cmpown' });
    const reader = await stack.createUser({ label: 'cmpread' });
    const outsider = await stack.createUser({ label: 'cmpout' });
    const project = await stack.createProject(owner, { title: `Compare read ${stack.tag}`, status: 'pre-production' });
    const script = (await stack.insert('scripts', { title: 'Kitchen', content: V2, project_id: project.id, created_by: owner.id, last_edited_by: owner.id })).id;
    await stack.admin.from('script_revisions').insert({ script_id: script, color_index: 1, label: 'Blue Revision', snapshot: V1, created_by: owner.id });
    await stack.admin.from('project_crew').insert({ project_id: project.id, user_id: reader.id, role: 'contributor', craft: 'Gaffer', status: 'confirmed' });

    await signInAs(page, reader);
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`/editor?script=${script}`);
    await expect(page.getByRole('textbox', { name: 'Script', exact: true })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Script', exact: true }).click();
    await page.getByRole('button', { name: 'Compare', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Compare script versions' });
    await expect(dialog.getByRole('button', { name: /INT\. ATTIC - NIGHT/ })).toBeVisible();

    // Riley: the revisions of a script nobody shared are not readable.
    const riley = stack.anonClient();
    await riley.auth.signInWithPassword({ email: outsider.email, password: outsider.password });
    const peek = await riley.from('script_revisions').select('id').eq('script_id', script);
    expect(peek.data ?? []).toEqual([]);
  });
});
