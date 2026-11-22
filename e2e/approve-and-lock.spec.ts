import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';

// BACKLOG 3.52: the owner approves the budget with a button (a later line change reads "changed since approved"), and locks a cut
// (it freezes: no new notes, no delete). Crew see the state but cannot change it. Opt-in: E2E_LOCAL_STACK=1.
test.describe('Approve the budget, lock a cut (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  test('approve, change a line, approve again, withdraw; the milestone follows', async ({ page, stack }) => {
    test.setTimeout(180_000);
    const sam = await stack.createUser({ label: 'approve' });
    const project = await stack.createProject(sam, { title: `Approve ${stack.tag}`, status: 'pre-production' });
    await stack.insert('budget_items', { project_id: project.id, category: 'Camera', amount: 1000, created_by: sam.id });
    await signInAs(page, sam);
    await page.setViewportSize({ width: 1400, height: 1000 });
    await page.goto(`/studio?project=${project.id}&tab=production&view=money`);
    const bar = page.getByTestId('budget-approval');
    await expect(bar).toContainText('Not approved', { timeout: 40_000 });

    await bar.getByRole('button', { name: 'Approve budget' }).click();
    await expect(bar).toContainText('Approved', { timeout: 20_000 });
    await expect.poll(async () => (await stack.admin.from('projects').select('budget_approved_total, budget_approved_lines').eq('id', project.id).single()).data)
      .toEqual({ budget_approved_total: 1000, budget_approved_lines: 1 });

    // A line changes after the approval: the bar says so until the owner approves again.
    await stack.admin.from('budget_items').update({ amount: 1200 }).eq('project_id', project.id);
    await page.reload();
    await expect(page.getByTestId('budget-approval')).toContainText('Changed since approved', { timeout: 40_000 });
    await page.getByTestId('budget-approval').getByRole('button', { name: 'Approve again' }).click();
    await expect(page.getByTestId('budget-approval')).toContainText('Approved', { timeout: 20_000 });

    await page.getByTestId('budget-approval').getByRole('button', { name: 'Withdraw' }).click();
    await page.getByRole('button', { name: 'Withdraw' }).last().click();
    await expect(page.getByTestId('budget-approval')).toContainText('Not approved', { timeout: 20_000 });
  });

  test('lock a cut: it freezes, takes no new note, and unlocks again; crew cannot lock', async ({ page, stack }) => {
    test.setTimeout(180_000);
    const sam = await stack.createUser({ label: 'lock' });
    const jordan = await stack.createUser({ label: 'lockcrew' });
    const project = await stack.createProject(sam, { title: `Lock ${stack.tag}`, status: 'post-production' });
    await stack.admin.from('project_crew').insert({ project_id: project.id, user_id: jordan.id, craft: 'Editor', status: 'confirmed' });
    await stack.insert('post_cuts', { project_id: project.id, title: 'Assembly', url: 'https://example.com/assembly', created_by: sam.id });

    await signInAs(page, sam);
    await page.setViewportSize({ width: 1400, height: 1000 });
    await page.goto(`/studio?project=${project.id}&tab=post`);
    await page.getByRole('button', { name: /^Assembly/ }).waitFor({ timeout: 40_000 });
    await expect(page.getByPlaceholder(/Note at the current moment|Note — Enter to add/)).toBeVisible();

    await page.getByRole('button', { name: 'Lock cut Assembly' }).click();
    await page.getByRole('button', { name: 'Lock', exact: true }).click();
    await expect(page.getByText('This cut is locked, so it takes no new notes.')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Delete cut Assembly' })).toHaveCount(0);
    await expect.poll(async () => (await stack.admin.from('post_cuts').select('locked_by').eq('project_id', project.id).single()).data?.locked_by).toBe(sam.id);

    await page.getByRole('button', { name: 'Unlock cut Assembly' }).click();
    await expect(page.getByPlaceholder(/Note at the current moment|Note — Enter to add/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Delete cut Assembly' })).toBeVisible();

    // Crew read the state but are not offered the lock.
    await page.context().clearCookies();
    await signInAs(page, jordan);
    await page.goto(`/studio?project=${project.id}&tab=post`);
    await page.getByRole('button', { name: /^Assembly/ }).waitFor({ timeout: 40_000 });
    await expect(page.getByRole('button', { name: 'Lock cut Assembly' })).toHaveCount(0);
  });
});
