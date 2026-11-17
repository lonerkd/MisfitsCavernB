import { test, expect, stackEnabled, stackSkipReason, type QaUser } from './support/stack';

// The Production tools that start from the script, in a real browser: the tool list is shut until asked for, and Safety, Permits
// and Weather read the script's scenes. Opt-in: E2E_LOCAL_STACK=1.
const SCRIPT = [
  'EXT. HARBOUR - NIGHT', '', 'MAYA fires the gun. Flames lick the boat.', '',
  'INT. KITCHEN - DAY', '', 'She sets a cup down.', '',
].join('\n');

test.describe('Production tools that read the script (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let me: QaUser;
  let projectId = '';
  let scriptId = '';

  test.beforeAll(async ({ stack }) => {
    me = await stack.createUser({ label: 'fromscript' });
    projectId = (await stack.createProject(me, { title: `FromScript ${stack.tag}` })).id;
    scriptId = (await stack.insert('scripts', { title: 'Harbour', content: SCRIPT, project_id: projectId, created_by: me.id, last_edited_by: me.id })).id;
  });

  test('the list is shut by default; Safety and Permits offer what the script says', async ({ page, stack }) => {
    test.setTimeout(180_000);
    await stack.signIn(page, me);
    await page.goto('/studio');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);

    // Opening the script reads it into scenes.
    await page.goto(`/editor?script=${scriptId}`);
    await expect(page.getByRole('textbox', { name: 'Script', exact: true })).toHaveValue(SCRIPT, { timeout: 30_000 });

    // The tool list opens on a press.
    await page.goto('/studio?tab=production&view=safety');
    const all = page.getByRole('button', { name: /^All tools/ });
    await expect(all).toHaveAttribute('aria-expanded', 'false', { timeout: 30_000 });
    await all.click();
    await expect(page.getByRole('tab', { name: /Permits/ })).toBeVisible();

    // Safety: the gun and the flames are flagged, and adding them writes real records.
    await expect(page.getByText('From the script')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Weapons and firearms').first()).toBeVisible();
    await page.getByRole('button', { name: /^Add all/ }).click();
    await expect(page.getByText('Safety plan saved').or(page.getByText(/added to the safety plan/))).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Fire, explosion or pyrotechnics').first()).toBeVisible();

    // Permits: the exterior harbour has not been checked, so it is offered.
    await page.goto('/studio?tab=production&view=permit');
    await expect(page.getByText('From your locations')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('HARBOUR').first()).toBeVisible();
  });
});
