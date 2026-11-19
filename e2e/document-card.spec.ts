import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';

// A document's card opens from its row in Production › Paperwork (BACKLOG 3.18, the card's entry points): the same card the
// stripboard and the library open, found by the document's own id (a document is an entity under its id). Opt-in: E2E_LOCAL_STACK=1.
test.describe('The card opens from a document (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  test('a Card button on a paperwork row opens that document’s card, and it closes', async ({ page, stack }) => {
    test.setTimeout(120_000);
    const owner = await stack.createUser({ label: 'doccard' });
    const project = await stack.createProject(owner, { title: `Doc card ${stack.tag}`, status: 'pre-production' }); // Paperwork is a pre-production tool: earlier phases show it behind "Opens in Pre-Production"
    const title = `Location release — doc${stack.tag}`;
    await stack.insert('project_documents', { project_id: project.id, kind: 'release', title, status: 'needed', created_by: owner.id });

    await signInAs(page, owner);
    await page.goto('/studio?tab=production&view=paperwork');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== project.id) await picker.selectOption(project.id);

    const open = page.getByRole('button', { name: `Open the card for ${title}` });
    await expect(open).toBeVisible({ timeout: 30_000 });
    await open.click();

    const card = page.getByRole('dialog', { name: new RegExp(`Document: ${title}`) });
    await expect(card).toBeVisible({ timeout: 20_000 });
    await expect(card.getByRole('heading', { name: title, level: 2 })).toBeVisible();

    await card.getByRole('button', { name: 'Close card' }).click();
    await expect(card).toHaveCount(0);
  });

  test('a document’s note can mention another document: the link is real and the chip opens its card', async ({ page, stack }) => {
    test.setTimeout(120_000);
    const owner = await stack.createUser({ label: 'docnote' });
    const project = await stack.createProject(owner, { title: `Doc note ${stack.tag}`, status: 'pre-production' });
    const first = await stack.insert('project_documents', { project_id: project.id, kind: 'release', title: `Release A ${stack.tag}`, status: 'needed', created_by: owner.id });
    const second = await stack.insert('project_documents', { project_id: project.id, kind: 'insurance', title: `Policy B ${stack.tag}`, status: 'needed', created_by: owner.id });

    await signInAs(page, owner);
    await page.goto('/studio?tab=production&view=paperwork');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== project.id) await picker.selectOption(project.id);

    await page.getByRole('button', { name: `Edit Release A ${stack.tag}` }).click({ timeout: 30_000 });
    const notes = page.getByRole('combobox', { name: `Notes for Release A ${stack.tag}` });
    await notes.fill('Covered by @Policy B');
    await page.getByRole('option', { name: new RegExp(`Policy B ${stack.tag}`) }).click();
    await page.getByRole('button', { name: `Save notes for Release A ${stack.tag}` }).click();

    await expect.poll(async () => (await stack.admin.from('links').select('to_entity').eq('from_entity', first.id).eq('kind', 'mentions')).data?.map((l) => l.to_entity)).toEqual([second.id]);
    const chip = page.getByRole('link', { name: `@Policy B ${stack.tag}` });
    await expect(chip).toBeVisible();
    expect(await chip.getAttribute('href')).toContain(`card=${second.id}`);

    // Clearing the note removes the link.
    await notes.fill('');
    await page.getByRole('button', { name: `Save notes for Release A ${stack.tag}` }).click();
    await expect.poll(async () => (await stack.admin.from('links').select('to_entity').eq('from_entity', first.id).eq('kind', 'mentions')).data?.length).toBe(0);
  });
});
