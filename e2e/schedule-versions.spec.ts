import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { SupabaseClient } from '@supabase/supabase-js';

// Schedule versions, in a real browser against a local stack: the owner saves a version of the stripboard, moves a scene, compares
// the version with the live board, restores it (the scene goes back, and the moved state is saved as an auto version first).
// Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Schedule versions (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  const owner = { id: '', email: `sv-owner.${TAG}@journey.test` };
  let projectId = '';
  let moved = '';

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    owner.id = (await stack.createUser({ email: owner.email, password: PASSWORD, username: `svowner${TAG}` })).id;
    projectId = (await admin.from('projects').insert({ title: `Versions ${TAG}`, creator_id: owner.id, status: 'pre-production' }).select('id').single()).data!.id;
    const scriptId = (await admin.from('scripts').insert({ title: 'Versions', content: 'INT. KITCHEN - DAY\n\nAction.\n\nEXT. ROOF - NIGHT\n\nAction.\n\nINT. HALL - DAY\n\nAction.\n', project_id: projectId, created_by: owner.id, last_edited_by: owner.id }).select('id').single()).data!.id;
    const scenes = (await admin.from('scenes').insert([
      { project_id: projectId, script_id: scriptId, ordinal: 0, scene_number: 1, title: 'INT. KITCHEN - DAY', heading: 'INT. KITCHEN - DAY', location: 'Kitchen', shoot_day: 1 },
      { project_id: projectId, script_id: scriptId, ordinal: 1, scene_number: 2, title: 'EXT. ROOF - NIGHT', heading: 'EXT. ROOF - NIGHT', location: 'Roof', shoot_day: 1 },
      { project_id: projectId, script_id: scriptId, ordinal: 2, scene_number: 3, title: 'INT. HALL - DAY', heading: 'INT. HALL - DAY', location: 'Hall', shoot_day: 2 },
    ]).select('id, scene_number')).data!;
    moved = scenes.find((x: { scene_number: number }) => x.scene_number === 2)!.id;
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
    if (owner.id) await admin.auth.admin.deleteUser(owner.id);
  });

  test('save a version, move a scene, compare, restore, and the moved state is kept as an auto version', async ({ page }) => {
    test.setTimeout(150_000);
    await signInAs(page, { email: owner.email, password: PASSWORD });
    await page.goto('/studio?tab=production&view=schedule');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);

    await page.getByRole('button', { name: /^Versions/ }).click({ timeout: 30_000 });
    await expect(page.getByText('No versions yet.')).toBeVisible();
    await page.getByLabel('Version name').fill('Kitchen first');
    await page.getByRole('button', { name: 'Save a version' }).click();
    await expect(page.getByTestId('schedule-version')).toHaveCount(1);
    expect((await admin.from('schedule_versions').select('label').eq('project_id', projectId)).data?.map((r: { label: string }) => r.label)).toEqual(['Kitchen first']);

    // Move scene 2 to day 2 with the keyboard, as a 1st AD would.
    const strip = page.getByRole('listitem', { name: /^Scene 2, / });
    await strip.focus();
    await page.keyboard.press('Alt+ArrowRight');
    await expect.poll(async () => (await admin.from('scenes').select('shoot_day').eq('id', moved).single()).data?.shoot_day).toBe(2);

    await page.getByRole('button', { name: 'Compare “Kitchen first” with the live schedule' }).click();
    await expect(page.getByRole('region', { name: /compared with the live schedule/ })).toContainText('1 scene moved');
    await expect(page.getByText('Scene 2: day 1 → day 2')).toBeVisible();

    await page.getByRole('button', { name: 'Restore “Kitchen first”' }).click();
    await page.getByRole('button', { name: 'Restore', exact: true }).click();
    await expect.poll(async () => (await admin.from('scenes').select('shoot_day').eq('id', moved).single()).data?.shoot_day).toBe(1);

    await expect(page.getByTestId('schedule-version')).toHaveCount(2);
    const rows = (await admin.from('schedule_versions').select('label, auto, snapshot').eq('project_id', projectId).order('created_at')).data as Array<{ label: string; auto: boolean; snapshot: { scenes: Array<{ id: string; shoot_day: number }> } }>;
    const auto = rows.find((r) => r.auto)!;
    expect(auto.label).toContain('Kitchen first');
    expect(auto.snapshot.scenes.find((s) => s.id === moved)?.shoot_day).toBe(2);
    await page.screenshot({ path: 'test-results/schedule-versions.png', fullPage: true });
  });
});
