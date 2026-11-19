import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';

// The coverage tracker on set (BACKLOG 3.18, graph step 6): rolling for two hours with four shots got and two hours to the planned wrap,
// the day will not reach everything; the view says how many shots short it is and which scenes to protect and which are at risk.
// Opt-in: E2E_LOCAL_STACK=1.
const SCRIPT = ['INT. KITCHEN - DAY', '', 'MAYA', 'Still up.', '', 'EXT. PIER - DAY', '', 'BEN', 'Boats.', '', 'INT. GARAGE - NIGHT', '', 'MAYA', 'Late.', ''].join('\n');
const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

test.describe('Coverage on set (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);
  // The times are built around "now"; keep the day clear of midnight so call, rolling and wrap fall on one date.
  test.skip(new Date().getHours() < 4 || new Date().getHours() >= 21, 'times are relative to now and must stay on one calendar day');

  test('behind: the shortfall, the scenes to protect and the ones at risk', async ({ page, stack }) => {
    test.setTimeout(150_000);
    const admin = stack.admin;
    const owner = await stack.createUser({ label: 'coverage' });
    const project = await stack.createProject(owner, { title: `Coverage ${stack.tag}`, status: 'production' });
    await stack.insert('scripts', { title: 'Coverage', content: SCRIPT, project_id: project.id, created_by: owner.id, last_edited_by: owner.id });
    const now = new Date();
    const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000);
    const wrap = new Date(now.getTime() + 130 * 60_000); // a little over two hours, so the minute the time is cut to does not matter
    const sheet = await stack.insert('call_sheets', { project_id: project.id, shoot_day: 1, shoot_date: ymd(now), general_call: hhmm(hoursAgo(3)), estimated_wrap: hhmm(wrap), location_address: 'Quarry Rd' });

    await signInAs(page, owner);
    await page.goto('/studio?tab=production&view=onset');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== project.id) await picker.selectOption(project.id);
    await expect.poll(async () => (await admin.from('scenes').select('id').eq('project_id', project.id).is('removed_at', null)).data?.length, { timeout: 30_000 }).toBe(3);
    const scenes = (await admin.from('scenes').select('id, scene_number').eq('project_id', project.id).order('scene_number')).data!;
    await admin.from('scenes').update({ shoot_day: 1 }).eq('project_id', project.id);
    const shot = (scene: string, n: string, status: string) => ({ project_id: project.id, scene_id: scene, shot_number: n, status, created_by: owner.id });
    expect((await admin.from('shots').insert([
      ...[1, 2, 3, 4].map((n) => shot(scenes[0].id, `1.${n}`, 'shot')),
      ...[1, 2, 3].map((n) => shot(scenes[1].id, `2.${n}`, 'planned')),
      ...[1, 2, 3, 4, 5].map((n) => shot(scenes[2].id, `3.${n}`, 'planned')),
    ])).error).toBeNull();
    expect((await admin.from('set_log').insert([
      { project_id: project.id, call_sheet_id: sheet.id, kind: 'call', at: hoursAgo(3).toISOString() },
      { project_id: project.id, call_sheet_id: sheet.id, kind: 'rolling', at: hoursAgo(2).toISOString() },
    ])).error).toBeNull();
    await page.reload();

    // Four shots in two hours is two an hour; a little over two hours left is four more; eight are left: four short.
    const note = page.getByRole('status', { name: 'Coverage' });
    await expect(note).toBeVisible({ timeout: 30_000 });
    await expect(note).toContainText('behind');
    await expect(note).toContainText('2 shots an hour');
    await expect(note).toContainText('4 short');
    await expect(note).toContainText('Protect scene 2.');
    await expect(note).toContainText('At risk: scene 3.');
  });
});
