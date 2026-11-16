import { test, expect, stackEnabled, stackSkipReason, type QaUser } from './support/stack';

// Undo and redo in the real editor: typing is grouped into steps by pauses,
// Ctrl+Z steps back, Ctrl+Shift+Z / Ctrl+Y steps forward. Guards the move of
// that logic out of the editor page. Opt-in: E2E_LOCAL_STACK=1 (or the staging
// variables; see e2e/support/stack.ts).
const BASE = 'INT. KITCHEN - NIGHT\n\nMAYA\nStill up.\n';

test.describe('Editor undo (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let me: QaUser;
  let projectId = '';
  let scriptId = '';

  test.beforeAll(async ({ stack }) => {
    me = await stack.createUser({ label: 'undo' });
    projectId = (await stack.createProject(me, { title: `Undo ${stack.tag}` })).id;
    scriptId = (await stack.insert('scripts', { title: 'Kitchen', content: BASE, project_id: projectId, created_by: me.id, last_edited_by: me.id })).id;
  });

  test('typing is undone a burst at a time, and redone', async ({ page, stack }) => {
    test.setTimeout(120_000);
    await stack.signIn(page, me);
    await page.goto('/studio');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    await page.goto(`/editor?script=${scriptId}`);
    const script = page.getByRole('textbox', { name: 'Script', exact: true });
    await expect(script).toHaveValue(BASE, { timeout: 30_000 });

    await script.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.type('\nFIRST');
    await page.waitForTimeout(900);          // a pause ends the step
    await page.keyboard.type('\nSECOND');
    await page.waitForTimeout(900);
    await expect(script).toHaveValue(BASE + '\nFIRST\nSECOND');

    await page.keyboard.press('Control+z');
    await expect(script).toHaveValue(BASE + '\nFIRST');
    await page.keyboard.press('Control+z');
    await expect(script).toHaveValue(BASE);
    await page.keyboard.press('Control+z');    // nothing left to undo
    await expect(script).toHaveValue(BASE);

    await page.keyboard.press('Control+Shift+z');
    await expect(script).toHaveValue(BASE + '\nFIRST');
    await page.keyboard.press('Control+y');
    await expect(script).toHaveValue(BASE + '\nFIRST\nSECOND');
  });
});
