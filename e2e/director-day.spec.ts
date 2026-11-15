import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The director's day at a glance, in a real browser against a local stack: a Direction craft sees the next shoot day's scenes, the
// shots planned for each and what still needs them; a gaffer and an outsider see no such card. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
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


test.describe('The director\'s day at a glance (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const owner = { id: '', email: `dd-owner.${TAG}@journey.test` };
  const director = { id: '', email: `dd-dir.${TAG}@journey.test` };
  const gaffer = { id: '', email: `dd-gaf.${TAG}@journey.test` };
  const outsider = { id: '', email: `dd-out.${TAG}@journey.test` };
  let projectId = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const [who, name] of [[owner, 'ddowner'], [director, 'dddir'], [gaffer, 'ddgaf'], [outsider, 'ddout']] as const) {
      who.id = (await admin.auth.admin.createUser({ email: who.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `${name}${TAG}` } })).data.user!.id;
    }
    projectId = (await admin.from('projects').insert({ title: `Glance ${TAG}`, creator_id: owner.id, status: 'production' }).select('id').single()).data!.id;
    await admin.from('project_crew').insert([
      { project_id: projectId, user_id: director.id, role: 'contributor', craft: 'Director', status: 'confirmed' },
      { project_id: projectId, user_id: gaffer.id, role: 'contributor', craft: 'Gaffer', status: 'confirmed' },
    ]);
    const scriptId = (await admin.from('scripts').insert({ title: 'Glance', content: 'INT. KITCHEN - DAY\n', project_id: projectId, created_by: owner.id, last_edited_by: owner.id }).select('id').single()).data!.id;
    const date = new Date(); date.setDate(date.getDate() + 3);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    await admin.from('shoot_days').insert({ project_id: projectId, day_number: 1, shoot_date: iso });
    const scenes = (await admin.from('scenes').insert([
      { project_id: projectId, script_id: scriptId, ordinal: 0, scene_number: 1, title: 'INT. KITCHEN - DAY', heading: 'INT. KITCHEN - DAY', location: 'Kitchen', cast_list: 'MAYA, BEN', shoot_day: 1 },
      { project_id: projectId, script_id: scriptId, ordinal: 1, scene_number: 2, title: 'EXT. ROOF - NIGHT', heading: 'EXT. ROOF - NIGHT', location: 'Roof', cast_list: 'MAYA', shoot_day: 1 },
    ]).select('id, scene_number')).data!;
    const first = scenes.find((x: { scene_number: number }) => x.scene_number === 1)!.id;
    await admin.from('shots').insert({ project_id: projectId, scene_id: first, shot_number: '1A', description: 'Wide' });
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
    for (const who of [owner, director, gaffer, outsider]) if (who.id) await admin.auth.admin.deleteUser(who.id);
  });

  const signIn = async (page: Page, who: { email: string }) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', who.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
  };

  test('the director sees the day: its scenes, the shots planned, and what needs them', async ({ page }) => {
    test.setTimeout(150_000);
    await signIn(page, director);
    await page.goto('/community');
    const card = page.getByRole('region', { name: 'The day at a glance' });
    await expect(card).toBeVisible({ timeout: 30_000 });
    const day = card.getByRole('article', { name: new RegExp(`Glance ${TAG}, day 1 at a glance`) });
    await expect(day).toContainText('2 scenes');
    await expect(day).toContainText('1 shot planned');
    const needs = day.getByRole('list', { name: 'Needs you before the day' });
    await expect(needs).toContainText('The call sheet has not been issued');
    await expect(needs).toContainText('1 of 2 scenes has no shots planned');
    const scenes = day.getByRole('list', { name: 'Scenes on this day' });
    await expect(scenes.getByRole('listitem').nth(0)).toContainText('INT. KITCHEN - DAY');
    await expect(scenes.getByRole('listitem').nth(1)).toContainText('No shots planned');
    expect(await axeViolations(page)).toEqual([]);
  });

  for (const [name, who] of [['a gaffer', gaffer], ['an outsider', outsider]] as const) {
    test(`${name} sees no day at a glance`, async ({ page }) => {
      test.setTimeout(120_000);
      await signIn(page, who);
      await page.goto('/community');
      await expect(page.getByRole('heading', { name: 'On set' })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('region', { name: 'The day at a glance' })).toHaveCount(0);
    });
  }
});
