import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

// A director's change, followed to the departments it touches, in a real browser against a local stack: the note names the departments linked
// to its scene (breakdown, department records, shots, the day) and the crew in them; pressing Tell sends each of them a notification, and nobody else.
// Opt-in: E2E_LOCAL_STACK=1.
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


test.describe('A director\'s change reaches the departments (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  const people = { owner: { id: '', email: `ci-owner.${TAG}@journey.test` }, costume: { id: '', email: `ci-cos.${TAG}@journey.test` }, dp: { id: '', email: `ci-dp.${TAG}@journey.test` }, sound: { id: '', email: `ci-snd.${TAG}@journey.test` } };
  let projectId = '';
  const TITLE = `Move to night ${TAG}`;

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    for (const [k, who] of Object.entries(people)) {
      who.id = (await stack.createUser({ email: who.email, password: PASSWORD, username: `ci${k}${TAG}` })).id;
    }
    projectId = (await admin.from('projects').insert({ title: `Change ${TAG}`, creator_id: people.owner.id, status: 'production' }).select('id').single()).data!.id;
    await admin.from('project_crew').insert([
      { project_id: projectId, user_id: people.costume.id, role: 'contributor', craft: 'Costume designer', status: 'confirmed' },
      { project_id: projectId, user_id: people.dp.id, role: 'contributor', craft: 'Director of photography', status: 'confirmed' },
      { project_id: projectId, user_id: people.sound.id, role: 'contributor', craft: 'Boom operator', status: 'confirmed' },
    ]);
    const scriptId = (await admin.from('scripts').insert({ title: 'Change', content: 'INT. KITCHEN - DAY\n', project_id: projectId, created_by: people.owner.id, last_edited_by: people.owner.id }).select('id').single()).data!.id;
    const sceneId = (await admin.from('scenes').insert({ project_id: projectId, script_id: scriptId, ordinal: 0, scene_number: 1, title: 'INT. KITCHEN - DAY', heading: 'INT. KITCHEN - DAY', shoot_day: 1 }).select('id').single()).data!.id;
    await admin.from('shots').insert({ project_id: projectId, scene_id: sceneId, shot_number: '1A' });
    // The breakdown seeds its categories with the project; tag a wardrobe element to the scene, and log a costume record on it.
    const cat = (await admin.from('breakdown_categories').select('id').eq('project_id', projectId).eq('key', 'wardrobe').single()).data!.id;
    const el = (await admin.from('breakdown_elements').insert({ project_id: projectId, category_id: cat, name: 'Trench coat' }).select('id').single()).data!.id;
    await admin.from('scene_elements').insert({ project_id: projectId, scene_id: sceneId, element_id: el });
    await admin.from('production_records').insert({ project_id: projectId, kind: 'costumes', item_id: 'k1', data: { character: 'Maya', scene: '1', change: 'Coat', status: 'planned' }, scene_ids: [sceneId], created_by: people.owner.id });
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('notifications').delete().in('user_id', Object.values(people).map((p) => p.id).filter(Boolean));
    await admin.from('projects').delete().eq('id', projectId);
    for (const who of Object.values(people)) if (who.id) await admin.auth.admin.deleteUser(who.id);
  });

  const signIn = async (page: Page) => {
    await signInAs(page, { email: people.owner.email, password: PASSWORD });
  };

  test('the note names the departments and people it touches, and Tell sends each of them a notification and no one else', async ({ page }) => {
    test.setTimeout(200_000);
    await signIn(page);
    await page.goto('/studio?tab=production&view=director');
    const picker = page.getByLabel('Active project');
    await picker.waitFor({ timeout: 30_000 });
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);

    const addScene = page.getByLabel('Scene: add a scene');
    await expect(addScene.locator('option')).not.toHaveCount(1, { timeout: 30_000 });
    await addScene.selectOption({ index: 1 });
    await page.getByPlaceholder('Vision note').fill(TITLE);
    await page.getByLabel('Changes the plan').check();
    await page.getByRole('button', { name: 'Add' }).click();

    await page.getByRole('button', { name: new RegExp(`Who does this touch\\? .${TITLE}.`) }).click();
    const region = page.getByRole('region', { name: new RegExp(`Who .${TITLE}. touches`) });
    await expect(region).toBeVisible({ timeout: 30_000 });
    await expect(region).toContainText('Wardrobe, hair & makeup');
    await expect(region).toContainText('1 breakdown element (wardrobe): Trench coat');
    await expect(region).toContainText('1 record in Costumes');
    await expect(region).toContainText(`ci${'costume'}${TAG} (Costume designer)`);
    await expect(region).toContainText('Camera');
    await expect(region).toContainText('1 planned shot');
    await expect(region).toContainText(`ci${'dp'}${TAG} (Director of photography)`);
    await expect(region).toContainText('scheduled on day 1');
    // The sound crew's department has nothing linked to this scene, so it is not named.
    await expect(region).not.toContainText('Sound');

    expect(await axeViolations(page)).toEqual([]);
    await page.getByRole('button', { name: /^Tell \d+ (person|people)$/ }).click();
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.getByText(/^Told \d+ (person|people)\.$/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Told \d+ (person|people) on /)).toBeVisible();

    const told = await admin.from('notifications').select('user_id, title, body').ilike('title', `%${TITLE}%`);
    const ids = (told.data ?? []).map((n: { user_id: string }) => n.user_id).sort();
    expect(ids).toEqual([people.costume.id, people.dp.id].sort());
    const cos = (told.data ?? []).find((n: { user_id: string }) => n.user_id === people.costume.id)!;
    expect(cos.title).toContain('(scene 1)');
    expect(cos.body).toContain('Trench coat');
  });
});
