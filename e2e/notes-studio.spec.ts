import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';

// BACKLOG 3.54, slice 2: a Notes project's Studio shows only what a notes space needs (Overview, Library, Share); a film keeps every tab;
// turning Notes into a Feature brings them back. Opt-in: E2E_LOCAL_STACK=1.
test.describe('The Studio of a Notes project (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  test('Notes shows three tabs, a link to a hidden tab lands on Overview, a film keeps all, a Feature brings them back', async ({ page, stack }) => {
    test.setTimeout(240_000);
    const sam = await stack.createUser({ label: 'notesstudio' });
    const notesTitle = `Notes ${stack.tag}`;
    const filmTitle = `Film ${stack.tag}`;
    const notes = await stack.createProject(sam, { title: notesTitle, status: 'concept' });
    await stack.admin.from('projects').update({ project_type: 'Notes' }).eq('id', notes.id);
    const film = await stack.createProject(sam, { title: filmTitle, status: 'concept' });
    await stack.admin.from('projects').update({ project_type: 'Short Film' }).eq('id', film.id);

    await signInAs(page, sam);
    await page.setViewportSize({ width: 1400, height: 1000 });
    const tabs = page.getByRole('navigation', { name: 'Studio sections' }).getByRole('tab');
    // The Studio opens the active project: choose it in the project picker.
    const openStudio = async (query: string, title: string) => {
      await page.goto(query ? `/studio?${query}` : '/studio');
      await page.getByRole('combobox', { name: 'Active project' }).selectOption({ label: title });
    };

    // A direct link to a tab a notes project hides lands on the Overview, with no crash and no blank screen.
    await openStudio('tab=production&view=schedule', notesTitle);
    await expect(tabs).toHaveCount(3, { timeout: 40_000 });
    await expect(tabs).toHaveText(['Overview', 'Library', 'Share']);
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: 'No phases here' })).toBeVisible();

    // The kept tabs open.
    await page.getByRole('tab', { name: 'Library' }).click();
    await expect(page.getByRole('tab', { name: 'Library' })).toHaveAttribute('aria-selected', 'true');

    // A film project in the same session keeps every tab.
    await openStudio('', filmTitle);
    await expect(page.getByRole('tab', { name: /^Production/ })).toBeVisible({ timeout: 40_000 });
    for (const name of [/^Overview/, /^Library/, /^Scenes/, /^Production/, /^Post/, /^Pitch/, /^Share/]) {
      await expect(page.getByRole('tab', { name })).toBeVisible();
    }

    // The board card of the Notes project carries no readiness bar.
    await page.goto('/projects');
    await expect(page.locator(`[data-project-card="${notes.id}"]`)).toBeVisible({ timeout: 40_000 });
    await expect(page.locator(`[data-project-card="${film.id}"]`)).toBeVisible();
    await expect(page.locator(`[data-project-card="${notes.id}"] [role="progressbar"]`)).toHaveCount(0);

    // Change the Notes project to a Feature: the tabs are back after a reload.
    await stack.admin.from('projects').update({ project_type: 'Feature' }).eq('id', notes.id);
    await openStudio('tab=production', notesTitle);
    await expect(page.getByRole('tab', { name: /^Production/ })).toBeVisible({ timeout: 40_000 });
    await expect(page.getByRole('tab', { name: /^Scenes/ })).toBeVisible();
  });

  test('starting a Notes project lands on its project page', async ({ page, stack }) => {
    test.setTimeout(120_000);
    const sam = await stack.createUser({ label: 'notesstart' });
    await signInAs(page, sam);
    await page.setViewportSize({ width: 1400, height: 1000 });
    await page.goto('/projects');
    await page.getByRole('button', { name: 'New Project', exact: true }).first().click({ timeout: 40_000 });
    await page.getByRole('radio', { name: 'Notes' }).click();
    await page.getByRole('textbox', { name: 'Title' }).fill(`Notes start ${stack.tag}`);
    await page.getByRole('button', { name: 'Create project' }).click();
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}/, { timeout: 40_000 });
    await expect(page.getByRole('heading', { name: 'No phases here' })).toBeVisible({ timeout: 40_000 });
  });
});
