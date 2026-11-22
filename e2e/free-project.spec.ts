import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';

// BACKLOG 3.54, slice 1: a Notes project has no phases. No ring, no milestones, no lock on any tool, and the owner can still turn it into a
// film or a series. Opt-in: E2E_LOCAL_STACK=1.
test.describe('The free project (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  test('a Notes project shows no phases and opens every tool; a film project still does both', async ({ page, stack }) => {
    test.setTimeout(180_000);
    const sam = await stack.createUser({ label: 'freeproj' });
    const notes = await stack.createProject(sam, { title: `Notes ${stack.tag}`, status: 'concept' });
    await stack.admin.from('projects').update({ project_type: 'Notes' }).eq('id', notes.id);
    const film = await stack.createProject(sam, { title: `Film ${stack.tag}`, status: 'concept' });
    await stack.admin.from('projects').update({ project_type: 'Short Film' }).eq('id', film.id);

    await signInAs(page, sam);
    await page.setViewportSize({ width: 1400, height: 1000 });

    // The Notes project: no phase, no milestone count, and a tool that a film would hold shut in development is open.
    await page.goto(`/projects/${notes.id}`);
    await expect(page.getByRole('heading', { name: 'No phases here' })).toBeVisible({ timeout: 40_000 });
    await expect(page.getByText(/\d+ of \d+ milestones/)).toHaveCount(0);
    await page.goto(`/studio?project=${notes.id}&tab=production&view=schedule`);
    await expect(page.getByText(/Opens in /)).toHaveCount(0, { timeout: 30_000 });

    // The same tool in a film project in development is locked, so the difference is the format.
    await page.goto(`/studio?project=${film.id}&tab=production&view=schedule`);
    await expect(page.getByText(/Opens in /).first()).toBeVisible({ timeout: 40_000 });
    await page.goto(`/projects/${film.id}`);
    await expect(page.getByText(/of \d+ milestones/)).toBeVisible({ timeout: 40_000 });
    await expect(page.getByRole('heading', { name: 'No phases here' })).toHaveCount(0);

    // The owner can make the Notes project a film; the phases appear.
    await page.goto(`/projects/${notes.id}`);
    await page.getByRole('button', { name: 'Change format' }).click({ timeout: 40_000 });
    await page.getByRole('button', { name: /^Make it a / }).click();
    await expect.poll(async () => (await stack.admin.from('projects').select('project_type').eq('id', notes.id).single()).data?.project_type).toBe('Feature');
    await expect(page.getByText(/of \d+ milestones/)).toBeVisible({ timeout: 40_000 });
  });

  test('Notes is offered when starting a project', async ({ page, stack }) => {
    test.setTimeout(120_000);
    const sam = await stack.createUser({ label: 'freeproj2' });
    await signInAs(page, sam);
    await page.setViewportSize({ width: 1400, height: 1000 });
    await page.goto('/projects');
    await page.getByRole('button', { name: 'New Project', exact: true }).first().click({ timeout: 40_000 });
    await expect(page.getByRole('heading', { name: 'Start a project' })).toBeVisible();
    // Choosing it says what it is, and does not list phases it does not have.
    await page.getByRole('radio', { name: 'Notes' }).click();
    await expect(page.getByText('No phases, no film.')).toBeVisible();
    await expect(page.getByText('Everything is open from the start')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Notes phases' })).toHaveCount(0);
  });
});
