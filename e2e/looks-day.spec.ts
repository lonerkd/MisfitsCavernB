import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import { linkCast } from './support/cast';

// The wardrobe and make-up person's day (BACKLOG 3.18, graph step 6), in a real browser against a local stack: a Costume or Makeup craft
// sees the next shoot day's looks on Your day, what is not written down and the look change that touches the day; a gaffer sees no such card.
// Opt-in: E2E_LOCAL_STACK=1.
test.describe('The looks for the next shoot day (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  test('a costume designer sees the day’s looks, the gaps and the change; a gaffer sees none', async ({ page, browser, stack }) => {
    test.setTimeout(150_000);
    const admin = stack.admin;
    const owner = await stack.createUser({ label: 'lookowner' });
    const costume = await stack.createUser({ label: 'costume' });
    const gaffer = await stack.createUser({ label: 'lookgaffer' });
    const project = await stack.createProject(owner, { title: `Looks ${stack.tag}`, status: 'pre-production' });
    await admin.from('project_crew').insert([
      { project_id: project.id, user_id: costume.id, role: 'contributor', craft: 'Costume designer', status: 'confirmed' },
      { project_id: project.id, user_id: gaffer.id, role: 'contributor', craft: 'Gaffer', status: 'confirmed' },
    ]);
    const script = (await stack.insert('scripts', { title: 'Looks', content: 'INT. KITCHEN - DAY\n', project_id: project.id, created_by: owner.id, last_edited_by: owner.id })).id;
    const date = new Date(); date.setDate(date.getDate() + 3);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    await admin.from('shoot_days').insert({ project_id: project.id, day_number: 1, shoot_date: iso });
    const scenes = (await admin.from('scenes').insert([
      { project_id: project.id, script_id: script, ordinal: 0, scene_number: 1, title: 'INT. KITCHEN - DAY', heading: 'INT. KITCHEN - DAY', shoot_day: 1, story_day: 1 },
      { project_id: project.id, script_id: script, ordinal: 1, scene_number: 2, title: 'EXT. PIER - DAY', heading: 'EXT. PIER - DAY', shoot_day: 1, story_day: 1 },
    ]).select('id, scene_number')).data!;
    const idOf = (n: number) => scenes.find((x: { scene_number: number }) => x.scene_number === n)!.id;
    await linkCast(admin, project.id, idOf(1), ['MAYA']);
    await linkCast(admin, project.id, idOf(2), ['MAYA', 'BEN']);
    const maya = (await admin.from('characters').select('id').eq('project_id', project.id).eq('name', 'MAYA').single()).data!.id;
    await admin.from('scene_states').insert([
      { project_id: project.id, scene_id: idOf(1), character_id: maya, look: 'Red coat' },
      { project_id: project.id, scene_id: idOf(2), character_id: maya, look: 'Blue coat' },
    ]);

    await signInAs(page, costume);
    await page.goto('/community');
    const card = page.getByRole('region', { name: 'Looks for the next shoot day' });
    await expect(card).toBeVisible({ timeout: 30_000 });
    const day = card.getByRole('article', { name: new RegExp(`Looks ${stack.tag}, day 1 looks`) });
    await expect(day).toContainText('MAYA: Red coat');
    await expect(day).toContainText('BEN: (no look noted)');
    await expect(day).toContainText('1 look is not written down yet');
    await expect(day).toContainText('Look change: MAYA: scene 1 “Red coat” then scene 2 “Blue coat”, both on day 1.');

    const ctx = await browser.newContext();
    const other = await ctx.newPage();
    try {
      await signInAs(other, gaffer);
      await other.goto('/community');
      await expect(other.getByRole('region', { name: 'On set' })).toBeVisible({ timeout: 30_000 });
      await expect(other.getByRole('region', { name: 'Looks for the next shoot day' })).toHaveCount(0);
    } finally {
      await ctx.close();
    }
  });
});
