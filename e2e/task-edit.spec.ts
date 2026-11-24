import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';

// A task's text can be edited in the project hub, and the mentions in it follow (BACKLOG 3.18, mentions). Opt-in: E2E_LOCAL_STACK=1.
test.describe('Editing a task’s text (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  test('the new text is saved and shown after a reload', async ({ page, stack }) => {
    test.setTimeout(120_000);
    const owner = await stack.createUser({ label: 'taskedit' });
    const project = await stack.createProject(owner, { title: `Task edit ${stack.tag}`, status: 'pre-production' });
    const title = `Book the van ${stack.tag}`;
    await stack.insert('project_tasks', { project_id: project.id, title });

    await signInAs(page, owner);
    await page.goto(`/projects/${project.id}`);
    await page.getByRole('button', { name: `Edit ${title}` }).click();
    const field = page.getByRole('textbox', { name: `Text of task ${title}` });
    await field.fill(`Book two vans ${stack.tag}`);
    await page.getByRole('button', { name: 'Save task text' }).click();
    await expect(page.getByText(`Book two vans ${stack.tag}`)).toBeVisible({ timeout: 30_000 });

    await page.reload();
    await expect(page.getByText(`Book two vans ${stack.tag}`)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(title)).toHaveCount(0);
  });
});
