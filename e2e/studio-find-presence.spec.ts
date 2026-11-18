import { test, expect, stackEnabled, stackSkipReason, type QaUser } from './support/stack';

// Outside Production: the Studio's tabs name who else is in them, and the header's search narrows a tab's list.
// Opt-in: E2E_LOCAL_STACK=1.
test.describe('Studio tabs: search and who is here (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let owner: QaUser;
  let crew: QaUser;
  let projectId = '';

  test.beforeAll(async ({ stack }) => {
    owner = await stack.createUser({ label: 'tabowner' });
    crew = await stack.createUser({ label: 'tabcrew' });
    projectId = (await stack.createProject(owner, { title: `Tabs ${stack.tag}` })).id;
    await stack.insert('project_crew', { project_id: projectId, user_id: crew.id, role: 'contributor', craft: 'Production designer', status: 'confirmed' });
  });

  test('a second person in the same tab is named; moving away clears it', async ({ page, browser, stack }) => {
    test.setTimeout(150_000);
    const open = async (p: typeof page, tab: string) => {
      await p.goto('/studio');
      const picker = p.getByLabel('Active project');
      await picker.waitFor();
      if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
      await p.goto(`/studio?tab=${tab}`);
    };
    await stack.signIn(page, owner);
    await open(page, 'library');
    await expect(page.getByRole('heading', { name: 'References & Media' })).toBeVisible({ timeout: 30_000 });

    const other = await browser.newContext();
    try {
      const page2 = await other.newPage();
      await stack.signIn(page2, crew);
      await open(page2, 'library');
      await expect(page2.getByRole('heading', { name: 'References & Media' })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('status').filter({ hasText: /here too/ })).toBeVisible({ timeout: 30_000 });
      await page2.goto('/studio?tab=share');
      await expect(page.getByRole('status').filter({ hasText: /here too/ })).toHaveCount(0, { timeout: 30_000 });
    } finally {
      await other.close();
    }
  });
});
