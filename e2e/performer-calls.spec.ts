import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { linkCast } from './support/cast';

// A performer's working surface, in a real browser against a local stack: "My calls" lists the call sheets issued on their
// production with their own call, the call sheet shows their own pages with their lines marked, and they confirm from there.
// An outsider has nothing. Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const SCRIPT = 'INT. HARBOR - NIGHT\n\nMAYA waits by the water.\n\nBEN\nTraffic.\n\nMAYA\nYou’re late.\n';
const inDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

async function axeViolations(page: Page): Promise<string[]> {
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))));
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)}`).join(' | ')}`);
  });
}

test.describe('Performer calls and pages (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  const owner = { id: '', email: `pc-owner.${TAG}@journey.test` };
  const actor = { id: '', email: `pc-actor.${TAG}@journey.test` };
  const outsider = { id: '', email: `pc-out.${TAG}@journey.test` };
  let projectId = '';
  let sheetId = '';

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    for (const [who, name] of [[owner, 'pcowner'], [actor, 'pcactor'], [outsider, 'pcout']] as const) {
      who.id = (await stack.createUser({ email: who.email, password: PASSWORD, username: `${name}${TAG}` })).id;
    }
    projectId = (await admin.from('projects').insert({ title: `Harbor ${TAG}`, creator_id: owner.id, status: 'production' }).select('id').single()).data!.id;
    await admin.from('project_crew').insert({ project_id: projectId, user_id: actor.id, role: 'contributor', craft: 'Actor', status: 'confirmed' });
    const scriptId = (await admin.from('scripts').insert({ title: 'Harbor', content: SCRIPT, project_id: projectId, created_by: owner.id, last_edited_by: owner.id }).select('id').single()).data!.id;
    const harborScene = (await admin.from('scenes').insert({ project_id: projectId, script_id: scriptId, ordinal: 0, scene_number: 1, title: 'Scene 1', heading: 'INT. HARBOR - NIGHT', shoot_day: 1 }).select('id').single()).data!.id;
    await linkCast(admin, projectId, harborScene, ['MAYA', 'BEN']);
    await admin.from('character_castings').insert({ project_id: projectId, character_name: 'MAYA', crew_user_id: actor.id, created_by: owner.id });
    sheetId = (await admin.from('call_sheets').insert({ project_id: projectId, shoot_day: 1, shoot_date: inDays(3), general_call: '07:00', location_address: '12 Pier Rd' }).select('id').single()).data!.id;
    await admin.from('call_sheet_calls').insert({ call_sheet_id: sheetId, project_id: projectId, character_name: 'MAYA', call_time: '06:30', remarks: 'Hair and makeup first' });
    // Issue as the owner (the database only lets the owner and leads issue).
    const anon = stack.anonClient();
    expect((await anon.auth.signInWithPassword({ email: owner.email, password: PASSWORD })).error).toBeNull();
    expect((await anon.rpc('issue_call_sheet', { p_sheet: sheetId })).error).toBeNull();
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
    for (const who of [owner, actor, outsider]) if (who.id) await admin.auth.admin.deleteUser(who.id);
  });

  const signIn = async (page: Page, who: { email: string }) => {
    await signInAs(page, { email: who.email, password: PASSWORD });
  };

  test('my calls → the call sheet → my pages with my lines marked → confirmed', async ({ page }) => {
    test.setTimeout(150_000);
    await signIn(page, actor);
    await page.goto('/call');
    await expect(page.getByRole('heading', { name: 'My calls' })).toBeVisible({ timeout: 30_000 });
    const row = page.getByRole('link', { name: new RegExp(`Harbor ${TAG}`) });
    await expect(row).toContainText('Day 1');
    await expect(row).toContainText('06:30');
    await expect(row).toContainText('Your call, as MAYA');
    await expect(row).toContainText('12 Pier Rd');
    await expect(row).toContainText('Confirm');
    expect(await axeViolations(page)).toEqual([]);

    await row.click();
    await expect(page.getByRole('heading', { name: 'Your call' })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /Show my pages for Day 1/ }).click();
    await expect(page.getByText('1 speech', { exact: false })).toBeVisible({ timeout: 30_000 });
    // Their own cue and speech are marked; the other actor's line is shown, not marked.
    const marked = page.locator('p[class*="sideMine"]');
    await expect(marked).toHaveText(['MAYA', 'You’re late.']);
    await expect(page.getByText('Traffic.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Print my pages' })).toBeVisible();

    await page.getByRole('button', { name: 'Got it' }).click();
    await expect(page.getByText('You confirmed v1')).toBeVisible();
    await page.goto('/call');
    await expect(page.getByRole('link', { name: new RegExp(`Harbor ${TAG}`) })).toContainText('Confirmed');
  });

  test('the Production tab points a performer to their calls, not to tools they do not use', async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, actor);
    await page.goto('/studio?tab=production');
    const picker = page.getByLabel('Active project');
    await picker.waitFor({ timeout: 30_000 });
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    await expect(page.getByRole('link', { name: 'open My calls' })).toBeVisible({ timeout: 30_000 });
  });

  test('an outsider has no calls', async ({ page }) => {
    test.setTimeout(90_000);
    await signIn(page, outsider);
    await page.goto('/call');
    await expect(page.getByText('No call sheets yet.')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('link', { name: new RegExp(`Harbor ${TAG}`) })).toHaveCount(0);
  });
});
