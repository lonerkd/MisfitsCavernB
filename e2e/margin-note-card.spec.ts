import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';

// Editor rung E5 (BACKLOG 3.18): a margin note written in the script is a thing in the film graph: it is tied to its scene by id, so the
// scene's card lists it, and it has a card of its own. Opt-in: E2E_LOCAL_STACK=1.
const SCRIPT = ['INT. KITCHEN - NIGHT', '', 'MAYA', 'Still up.', '', 'EXT. PIER - DAY', '', 'BEN', 'Boats.', ''].join('\n');

test.describe('A margin note in the graph (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  test('the note is linked to its scene by id and shows on the scene’s card and its own', async ({ page, stack }) => {
    test.setTimeout(150_000);
    const admin = stack.admin;
    const owner = await stack.createUser({ label: 'marginnote' });
    const project = await stack.createProject(owner, { title: `Margin ${stack.tag}`, status: 'pre-production' });
    const script = (await stack.insert('scripts', { title: 'Kitchen', content: SCRIPT, project_id: project.id, created_by: owner.id, last_edited_by: owner.id })).id;

    await signInAs(page, owner);
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto(`/editor?script=${script}`);
    const editor = page.getByRole('textbox', { name: 'Script', exact: true });
    await expect(editor).toHaveValue(SCRIPT, { timeout: 30_000 });
    await expect.poll(async () => (await admin.from('scenes').select('id').eq('script_id', script).is('removed_at', null)).data?.length ?? 0, { timeout: 30_000 }).toBe(2);

    // A note on the second scene's heading line (line 5).
    await editor.click();
    await editor.press('Control+Home');
    for (let i = 0; i < 5; i++) await editor.press('ArrowDown');
    await page.getByTitle('Add margin note').dispatchEvent('click'); // the dot sits in the margin, under the text layer for the pointer
    await page.getByPlaceholder(/Routes to this line of the script/).fill('Check the tide table');
    await page.getByPlaceholder(/Routes to this line of the script/).press('Enter');

    const note = async () => (await admin.from('script_annotations').select('id').eq('script_id', script).eq('text', 'Check the tide table').maybeSingle()).data;
    await expect.poll(async () => !!(await note()), { timeout: 30_000 }).toBe(true);
    const noteId = (await note())!.id;
    const pier = (await admin.from('scenes').select('id').eq('script_id', script).eq('scene_number', 2).single()).data!.id;
    await expect.poll(async () => (await admin.from('entities').select('kind, label').eq('id', noteId).maybeSingle()).data, { timeout: 30_000 }).toEqual({ kind: 'note', label: 'Check the tide table' });
    await expect.poll(async () => (await admin.from('links').select('to_entity').eq('from_entity', noteId)).data?.map((l) => l.to_entity), { timeout: 30_000 }).toEqual([pier]);

    // The scene's card lists the note; the note opens its own card.
    await page.goto(`/studio?project=${project.id}&card=${pier}`);
    const sceneCard = page.getByRole('dialog', { name: /^Scene: 2\./ });
    await expect(sceneCard).toBeVisible({ timeout: 30_000 });
    await expect(sceneCard.getByText('Check the tide table')).toBeVisible();
    await page.goto(`/studio?project=${project.id}&card=${noteId}`);
    const noteCard = page.getByRole('dialog', { name: 'Note: Check the tide table' });
    await expect(noteCard).toBeVisible({ timeout: 30_000 });
    await expect(noteCard.getByText(/2\. EXT\. PIER/)).toBeVisible();
  });
});
