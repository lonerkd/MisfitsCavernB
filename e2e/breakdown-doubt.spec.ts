import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';

// The deep brain, B9: where the reader was unsure of a scene, the breakdown says so on that scene's sheet, so what is tagged there is not trusted blindly.
// Opt-in: E2E_LOCAL_STACK=1.
// BEN is a cue with a line under it that reads like action ("She smiles"): the reader is not sure what BEN's block is. Scene 2 is plain.
const SCRIPT = 'INT. ROOM - DAY\n\nMaya waits.\n\nMAYA\nHello.\nShe smiles\nand leaves\n\nBEN\nOK.\n\nEXT. PIER - DAY\n\nMAYA\nBoats.\n\nSAM\nYes.\n';

test.describe('A doubtful read shows in the breakdown (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  test('the doubtful scene carries the note and the plain one does not', async ({ page, stack }) => {
    test.setTimeout(120_000);
    const owner = await stack.createUser({ label: 'bddoubt' });
    const project = await stack.createProject(owner, { title: `Breakdown doubt ${stack.tag}`, status: 'pre-production' });
    await stack.insert('scripts', { title: 'Doubt', content: SCRIPT, project_id: project.id, created_by: owner.id, last_edited_by: owner.id });

    await signInAs(page, owner);
    await page.goto('/studio?tab=production&view=breakdown');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== project.id) await picker.selectOption(project.id);

    await page.getByRole('tab', { name: 'By scene' }).click();
    const first = page.getByRole('region', { name: 'Scene 1' });
    await expect(first.getByRole('note')).toContainText('doubtful', { timeout: 30_000 });
    await expect(page.getByRole('region', { name: 'Scene 2' }).getByRole('note')).toHaveCount(0);
  });
});
