import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';

// Editor rung E4 (BACKLOG 3.18): rename a character from the script's Character Report. Every cue of the character is rewritten in one
// edit through the shared text, the production's character row takes the new name (same id, so the scenes' links and the casting follow),
// and the next scene sync does not bring the old name back. Opt-in: E2E_LOCAL_STACK=1.
const SCRIPT = ['INT. KITCHEN - NIGHT', '', 'MAYA', 'Still up.', '', 'BEN', 'Maya, sleep.', '', 'EXT. PIER - DAY', '', 'MAYA (V.O.)', 'Boats.', ''].join('\n');

test.describe('Renaming a character in the editor (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  test('the cues, the character row and its casting all take the new name; the old one does not come back', async ({ page, stack }) => {
    test.setTimeout(150_000);
    const admin = stack.admin;
    const owner = await stack.createUser({ label: 'rename' });
    const project = await stack.createProject(owner, { title: `Rename ${stack.tag}`, status: 'pre-production' });
    const script = (await stack.insert('scripts', { title: 'Kitchen', content: SCRIPT, project_id: project.id, created_by: owner.id, last_edited_by: owner.id })).id;

    await signInAs(page, owner);
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto(`/editor?script=${script}`);
    const editor = page.getByRole('textbox', { name: 'Script', exact: true });
    await expect(editor).toHaveValue(SCRIPT, { timeout: 30_000 });

    // The scene sync makes the graph's rows; a casting is attached to MAYA by id.
    await expect.poll(async () => (await admin.from('characters').select('id').eq('project_id', project.id).eq('name', 'MAYA')).data?.length ?? 0, { timeout: 30_000 }).toBe(1);
    const maya = (await admin.from('characters').select('id').eq('project_id', project.id).eq('name', 'MAYA').single()).data!.id;
    const actor = await stack.createUser({ label: 'actor' });
    await admin.from('project_crew').insert({ project_id: project.id, user_id: actor.id, role: 'contributor', craft: 'Actor', status: 'confirmed' });
    const cast = await admin.from('character_castings').insert({ project_id: project.id, character_id: maya, character_name: 'MAYA', crew_user_id: actor.id, created_by: owner.id });
    expect(cast.error).toBeNull();

    await page.getByRole('button', { name: 'Script', exact: true }).click();
    await page.getByRole('button', { name: /Character Report/ }).click();
    await page.getByRole('button', { name: 'Rename MAYA' }).click();
    await page.getByLabel('New name for MAYA').fill('Mia');
    await page.getByRole('button', { name: 'Rename', exact: true }).click();

    // The text: every cue of MAYA, the extension kept, BEN's line about Maya left alone.
    await expect(editor).toHaveValue(SCRIPT.replace('MAYA (V.O.)', 'MIA (V.O.)').replace('\nMAYA\n', '\nMIA\n'), { timeout: 30_000 });

    // The graph: the same character row under the new name, the casting followed by id.
    await expect.poll(async () => (await admin.from('characters').select('name').eq('id', maya).single()).data?.name, { timeout: 30_000 }).toBe('MIA');
    await expect.poll(async () => (await admin.from('character_castings').select('character_name').eq('character_id', maya).single()).data?.character_name).toBe('MIA');

    // The script saves, the scenes re-sync, and MAYA is not recreated.
    await expect.poll(async () => (await admin.from('scripts').select('content').eq('id', script).single()).data?.content, { timeout: 30_000 }).toContain('MIA (V.O.)');
    await page.waitForTimeout(3000);
    expect((await admin.from('characters').select('name').eq('project_id', project.id).order('name')).data?.map((c) => c.name)).toEqual(['BEN', 'MIA']);

    // A name already taken is refused with a sentence, and nothing changes.
    await page.getByRole('button', { name: 'Rename BEN' }).click();
    await page.getByLabel('New name for BEN').fill('mia');
    await page.getByRole('button', { name: 'Rename', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: /already a character/ })).toBeVisible();
    expect((await admin.from('characters').select('name').eq('project_id', project.id).order('name')).data?.map((c) => c.name)).toEqual(['BEN', 'MIA']);
  });

  test('a co-writer typing in another window while a character is renamed: both survive', async ({ page, browser, stack }) => {
    test.setTimeout(150_000);
    const owner = await stack.createUser({ label: 'renamepair' });
    const project = await stack.createProject(owner, { title: `Rename pair ${stack.tag}`, status: 'pre-production' });
    const script = (await stack.insert('scripts', { title: 'Kitchen', content: SCRIPT, project_id: project.id, created_by: owner.id, last_edited_by: owner.id })).id;

    await signInAs(page, owner);
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto(`/editor?script=${script}`);
    const a = page.getByRole('textbox', { name: 'Script', exact: true });
    await expect(a).toHaveValue(SCRIPT, { timeout: 30_000 });

    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    const other = await ctx.newPage();
    try {
      await signInAs(other, owner);
      await other.goto(`/editor?script=${script}`);
      const b = other.getByRole('textbox', { name: 'Script', exact: true });
      await expect(b).toHaveValue(SCRIPT, { timeout: 30_000 });

      // The second writer types a new line at the end while the first renames.
      await b.click();
      await b.press('Control+End');
      await b.pressSequentially('\nTHE END.');

      await page.getByRole('button', { name: 'Script', exact: true }).click();
      await page.getByRole('button', { name: /Character Report/ }).click();
      await page.getByRole('button', { name: 'Rename MAYA' }).click();
      await page.getByLabel('New name for MAYA').fill('Mia');
      await page.getByRole('button', { name: 'Rename', exact: true }).click();

      for (const box of [a, b]) {
        await expect(box).toHaveValue(/\nMIA\n/, { timeout: 30_000 });
        await expect(box).toHaveValue(/MIA \(V\.O\.\)/);
        await expect(box).toHaveValue(/THE END\./);
        await expect(box).not.toHaveValue(/\nMAYA\n/);
      }
    } finally {
      await ctx.close();
    }
  });
});
