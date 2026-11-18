import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, stackEnabled, stackSkipReason } from './support/stack';
import type { Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

// The shoot packaged for the editor, in a real browser against a local stack: the selected take of each shot, what is missing (a shot with no
// selected take, no sound report, a card not verified), and the package turning ready once the crew fix it. Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

async function axeViolations(page: Page): Promise<string[]> {
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))));
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)}`).join(' | ')}`);
  });
}


test.describe('Package for the editor (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  const owner = { id: '', email: `ep-owner.${TAG}@journey.test` };
  let projectId = '';
  let sceneId = '';
  let shotB = '';
  const rec = (kind: string, item_id: string, data: Record<string, unknown>) => ({ project_id: projectId, kind, item_id, data, created_by: owner.id });

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    owner.id = (await admin.auth.admin.createUser({ email: owner.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `epowner${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Package ${TAG}`, creator_id: owner.id, status: 'production' }).select('id').single()).data!.id;
    const scriptId = (await admin.from('scripts').insert({ title: 'Package', content: 'INT. KITCHEN - DAY\n', project_id: projectId, created_by: owner.id, last_edited_by: owner.id }).select('id').single()).data!.id;
    sceneId = (await admin.from('scenes').insert({ project_id: projectId, script_id: scriptId, ordinal: 0, scene_number: 1, title: 'INT. KITCHEN - DAY', heading: 'INT. KITCHEN - DAY', shoot_day: 1 }).select('id').single()).data!.id;
    const shots = (await admin.from('shots').insert([{ project_id: projectId, scene_id: sceneId, shot_number: '1A' }, { project_id: projectId, scene_id: sceneId, shot_number: '1B' }]).select('id, shot_number')).data!;
    const a = shots.find((x: { shot_number: string }) => x.shot_number === '1A')!.id;
    const b = shots.find((x: { shot_number: string }) => x.shot_number === '1B')!.id;
    await admin.from('production_records').insert([
      rec('scriptNotes', 'n1', { scene_ids: [sceneId], scene: '1', shot_id: a, take: 'T1', slate: 'A-1', lens: '35mm', notes: '', circle: true, from_line: 1, to_line: 3 }),
      rec('scriptNotes', 'n2', { scene_ids: [sceneId], scene: '1', shot_id: b, take: 'T3', slate: 'B-1', lens: '50mm', notes: '', circle: false }),
      rec('cameraReports', 'c1', { scene_ids: [sceneId], scene: '1', shot: '1A', lens: '35mm', tStop: '2.8', filter: '', camera: 'A', media: 'A001', notes: '' }),
      rec('mediaOffloads', 'o1', { card: 'A001', camera: 'A', size: '64', checksum: 'x', destination: 'Drive 1', status: 'pending' }),
    ]);
    shotB = b;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
    if (owner.id) await admin.auth.admin.deleteUser(owner.id);
  });

  const signIn = async (page: Page) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', owner.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
  };
  const open = async (page: Page) => {
    await page.goto('/studio?tab=production&view=editorial');
    const picker = page.getByLabel('Active project');
    await picker.waitFor({ timeout: 30_000 });
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    return page.getByRole('region', { name: 'Package for the editor' });
  };

  test('the package names the take to use and what is missing, and turns ready once it is fixed', async ({ page }) => {
    test.setTimeout(180_000);
    await signIn(page);
    let panel = await open(page);
    await expect(panel).toBeVisible({ timeout: 30_000 });
    await expect(panel.getByRole('list', { name: 'Scenes in the package' })).toContainText('1A: use take T1 (A-1) · lines 1–3');
    await expect(panel.getByRole('list', { name: 'Scenes in the package' })).toContainText('1B: none selected');
    const missing = panel.getByRole('list', { name: 'Not ready' });
    await expect(missing).toContainText('Scene 1, shot 1B: 1 take logged, none selected.');
    await expect(missing).toContainText('Scene 1: takes are logged but there is no sound report.');
    await expect(missing).toContainText('1 card is not verified yet: A001.');
    await expect(panel.getByRole('status')).toContainText('3 things the editor cannot use yet');
    await expect(panel.getByRole('button', { name: /Print \/ PDF: the editor/ })).toBeVisible();

    // The crew fix it: the take is circled, sound is reported, the card is verified.
    await admin.from('production_records').update({ data: { scene_ids: [sceneId], scene: '1', shot_id: shotB, take: 'T3', slate: 'B-1', lens: '50mm', notes: '', circle: true } }).eq('project_id', projectId).eq('item_id', 'n2');
    await admin.from('production_records').insert({ project_id: projectId, kind: 'soundReports', item_id: 's1', data: { scene_ids: [sceneId], scene: '1', take: 'T1', mic: 'Boom', wildTrack: 'no', roomTone: 'yes', notes: 'Clean' }, created_by: owner.id });
    await admin.from('production_records').update({ data: { card: 'A001', camera: 'A', size: '64', checksum: 'x', destination: 'Drive 1', status: 'verified' } }).eq('project_id', projectId).eq('item_id', 'o1');
    await page.reload();
    panel = await open(page);
    await expect(panel.getByRole('status')).toContainText('Everything logged is ready for editorial.', { timeout: 30_000 });
    await expect(panel.getByRole('list', { name: 'Not ready' })).toHaveCount(0);
    await expect(panel).toContainText('room tone');
    expect(await axeViolations(page)).toEqual([]);
  });
});
