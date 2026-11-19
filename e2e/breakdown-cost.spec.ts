import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';

// Step 5 of the film graph (BACKLOG 3.18): what a scene and a shoot day cost, read from the breakdown's elements and tags. Real rows,
// real page. Opt-in: E2E_LOCAL_STACK=1.
const SCRIPT = ['INT. KITCHEN - NIGHT', '', 'MAYA', 'Still up.', '', 'EXT. PIER - DAY', '', 'MAYA', 'Boats.', ''].join('\n');

test.describe('Cost by scene and by day (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  test('each scene shows what it needs and each day what it costs, an element on one day counted once', async ({ page, stack }) => {
    test.setTimeout(120_000);
    const owner = await stack.createUser({ label: 'costday' });
    const project = await stack.createProject(owner, { title: `Cost ${stack.tag}`, status: 'pre-production' });
    await stack.insert('scripts', { title: 'Cost', content: SCRIPT, project_id: project.id, created_by: owner.id, last_edited_by: owner.id });

    const admin = stack.admin;
    // The Studio reads the script's scenes into rows when it opens the project, so open it first.
    await signInAs(page, owner);
    await page.goto('/studio?tab=production&view=breakdown');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== project.id) await picker.selectOption(project.id);

    const listScenes = async () => (await admin.from('scenes').select('id, scene_number').eq('project_id', project.id).order('scene_number')).data ?? [];
    await expect.poll(async () => (await listScenes()).length, { timeout: 30_000 }).toBe(2);
    const scenes = await listScenes();
    const { data: cats } = await admin.from('breakdown_categories').select('id, key').eq('project_id', project.id);
    const props = cats?.find((c) => c.key === 'props')?.id;
    expect(props, 'the project has a props category').toBeTruthy();
    const lantern = (await admin.from('breakdown_elements').insert({ project_id: project.id, category_id: props, name: 'Lantern', cost: 100 }).select('id').single()).data!.id;
    const rope = (await admin.from('breakdown_elements').insert({ project_id: project.id, category_id: props, name: 'Rope', cost: 40 }).select('id').single()).data!.id;
    // The lantern is in both scenes, the rope only in the second. Both scenes shoot on day 1 (no day set).
    await admin.from('scene_elements').insert([
      { project_id: project.id, scene_id: scenes[0].id, element_id: lantern },
      { project_id: project.id, scene_id: scenes[1].id, element_id: lantern },
      { project_id: project.id, scene_id: scenes[1].id, element_id: rope },
    ]);

    await page.reload();
    await page.getByRole('tab', { name: 'Cost by day' }).click();
    const day1 = page.getByRole('region', { name: 'Day 1 cost' });
    // Lantern once ($100) plus the rope ($40): the day needs $140, though the two scenes add up to $240.
    await expect(day1.getByText('$100', { exact: true })).toBeVisible({ timeout: 30_000 });
    // The day's header and the second scene's row both read $140.
    await expect(day1.getByText('$140', { exact: true })).toHaveCount(2);

    await page.getByRole('tab', { name: 'By scene' }).click();
    await expect(page.getByRole('region', { name: 'Scene 2' }).getByText(/\$140/)).toBeVisible();
  });
});
