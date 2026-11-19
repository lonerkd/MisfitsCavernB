import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';

// A task's card opens from its row in the project hub (BACKLOG 3.18, the card's entry points): the hub is outside the Studio,
// so the Card link goes to /studio?card=<task id>, the same address a mention's chip uses. Opt-in: E2E_LOCAL_STACK=1.
test.describe('The card opens from a task (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  test('a Card link on a hub task opens that task’s card in the Studio', async ({ page, stack }) => {
    test.setTimeout(120_000);
    const owner = await stack.createUser({ label: 'taskcard' });
    const project = await stack.createProject(owner, { title: `Task card ${stack.tag}`, status: 'pre-production' });
    const title = `Book the van ${stack.tag}`;
    await stack.insert('project_tasks', { project_id: project.id, title });

    await signInAs(page, owner);
    await page.goto(`/projects/${project.id}`);
    const open = page.getByRole('link', { name: `Open the card for ${title}` });
    await expect(open).toBeVisible({ timeout: 30_000 });
    await open.click();

    await expect(page).toHaveURL(/\/studio\?.*card=/);
    const card = page.getByRole('dialog', { name: new RegExp(`Task: ${title}`) });
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.getByRole('button', { name: 'Close card' }).click();
    await expect(card).toHaveCount(0);
  });
});
