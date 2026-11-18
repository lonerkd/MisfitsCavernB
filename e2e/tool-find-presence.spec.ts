import { test, expect, stackEnabled, stackSkipReason, type QaUser } from './support/stack';

// Inside a Production tool: the header's search narrows the list, and a second person with the same tool open is named in it.
// Opt-in: E2E_LOCAL_STACK=1.
test.describe('Tool search and who is here (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let owner: QaUser;
  let crew: QaUser;
  let projectId = '';

  test.beforeAll(async ({ stack }) => {
    owner = await stack.createUser({ label: 'findowner' });
    crew = await stack.createUser({ label: 'findcrew' });
    projectId = (await stack.createProject(owner, { title: `Find ${stack.tag}` })).id;
    await stack.insert('project_crew', { project_id: projectId, user_id: crew.id, role: 'contributor', craft: 'Production designer', status: 'confirmed' });
    for (const [n, hazard, location] of [['1', 'Stunt fall', 'Harbour'], ['2', 'Pyrotechnics', 'Quarry'], ['3', 'Night exterior', 'Harbour']]) {
      await stack.insert('production_records', { project_id: projectId, kind: 'safety', item_id: `sf-${n}`, data: { hazard, location, severity: 'medium', mitigation: '', owner: '', status: 'identified' } });
    }
  });

  test('search narrows the list; the other person is named in the header', async ({ page, browser, stack }) => {
    test.setTimeout(150_000);
    const selectProject = async (p: typeof page) => {
      await p.goto('/studio');
      const picker = p.getByLabel('Active project');
      await picker.waitFor();
      if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    };

    await stack.signIn(page, owner);
    await selectProject(page);
    await page.goto('/studio?tab=production&view=safety');
    await expect(page.getByText('Stunt fall')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Pyrotechnics')).toBeVisible();

    const box = page.getByRole('searchbox', { name: 'Search this tool' });
    await box.fill('harbour');
    await expect(page.getByText('Pyrotechnics')).toHaveCount(0);
    await expect(page.getByText('Stunt fall')).toBeVisible();
    await expect(page.getByText('Night exterior')).toBeVisible();
    await expect(page.getByText('2 of 3')).toBeVisible();
    await box.fill('nothing like it');
    await expect(page.getByText('No records match your search.')).toBeVisible();
    await box.fill('');
    await expect(page.getByText('Pyrotechnics')).toBeVisible();

    // The second person opens the same tool: the owner's header says so.
    const other = await browser.newContext();
    try {
      const page2 = await other.newPage();
      await stack.signIn(page2, crew);
      await selectProject(page2);
      await page2.goto('/studio?tab=production&view=safety');
      await expect(page2.getByText('Stunt fall')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('status').filter({ hasText: /here too/ })).toBeVisible({ timeout: 30_000 });

      // They move to another tool: the line goes.
      await page2.goto('/studio?tab=production&view=permit');
      await expect(page.getByRole('status').filter({ hasText: /here too/ })).toHaveCount(0, { timeout: 30_000 });
    } finally {
      await other.close();
    }
  });
});
