import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';

// A document's card opens from its row in Production › Paperwork (BACKLOG 3.18, the card's entry points): the same card the
// stripboard and the library open, found by the document's own id (a document is an entity under its id). Opt-in: E2E_LOCAL_STACK=1.
test.describe('The card opens from a document (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  test('a Card button on a paperwork row opens that document’s card, and it closes', async ({ page, stack }) => {
    test.setTimeout(120_000);
    const owner = await stack.createUser({ label: 'doccard' });
    const project = await stack.createProject(owner, { title: `Doc card ${stack.tag}` });
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
});
