import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Scene readiness in a real browser against a local stack: the board names
// what blocks each scene, links to where it's fixed, and turns green live as
// the crew does the work (castings, breakdown, shots, a dated day).
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const SCRIPT = 'INT. CAVE - NIGHT\n\nSam lights the lantern.\n\nSAM\nWho’s there?\n\nEXT. RIDGE - DAWN\n\nWind over the ridge.\n';

async function axeViolations(page: Page): Promise<string[]> {
  // Measure the settled page: colours mid-fade (the status pill animating in) aren't what anyone reads.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity), undefined, { timeout: 5_000 }).catch(() => {});
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)} ${n.any?.[0]?.message ?? ''}`).join(' | ')}`);
  });
}

test.describe('Scene readiness (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId: string;
  let email: string;
  let projectId: string;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    email = `rd.${Date.now()}@journey.test`;
    const { data } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `rd${Date.now().toString(36)}` } });
    userId = data.user!.id;
    projectId = (await admin.from('projects').insert({ title: 'The Ridge', creator_id: userId, status: 'pre-production' }).select('id').single()).data!.id;
    await admin.from('scripts').insert({ title: 'The Ridge', content: SCRIPT, project_id: projectId, created_by: userId, last_edited_by: userId });
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.auth.admin.deleteUser(userId);
  });

  test('names each blocker, links to the fix, and turns green as the work is done', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    await page.goto('/studio?tab=scenes');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    // The Studio reads the script into scenes.
    await expect.poll(async () => (await admin.from('scenes').select('id').eq('project_id', projectId).is('removed_at', null)).data?.length, { timeout: 20_000 }).toBe(2);
    const scenes = (await admin.from('scenes').select('id, scene_number').eq('project_id', projectId).order('scene_number')).data!;

    await page.goto('/studio?tab=production&view=readiness');
    const todo = page.getByRole('region', { name: 'What unblocks the most' });
    await expect(todo.getByText('Cast SAM')).toBeVisible({ timeout: 20_000 });
    await expect(todo.getByText('Break down 2 scenes')).toBeVisible();
    await expect(todo.getByText('Plan shots for 2 scenes')).toBeVisible();
    await expect(todo.getByText('Date day 1')).toBeVisible();
    await expect(todo.getByText(/^Lock down /)).toBeVisible();
    await expect(page.getByRole('region', { name: 'Next shoot day' })).toContainText('2 blocked');

    // A scene's checks, with the fix for each.
    await page.getByRole('button', { name: /INT\. CAVE - NIGHT/ }).click();
    expect(await axeViolations(page)).toEqual([]);

    // "Cast it" goes where casting happens.
    await todo.getByRole('button', { name: 'Cast it' }).click();
    await expect(page).toHaveURL(/view=crew/);
    await page.goto('/studio?tab=production&view=readiness');
    await expect(todo.getByText('Cast SAM')).toBeVisible({ timeout: 20_000 });

    // The crew does the work elsewhere; the board follows live.
    await admin.from('character_castings').insert({ project_id: projectId, character_name: 'SAM', crew_user_id: userId, created_by: userId });
    await expect(todo.getByText('Cast SAM')).toHaveCount(0, { timeout: 20_000 });

    const props = (await admin.from('breakdown_categories').select('id').eq('project_id', projectId).eq('key', 'props').single()).data!;
    const lantern = (await admin.from('breakdown_elements').insert({ project_id: projectId, category_id: props.id, name: 'Lantern', status: 'sourcing' }).select('id').single()).data!;
    for (const sc of scenes) {
      await admin.from('scene_elements').insert({ project_id: projectId, scene_id: sc.id, element_id: lantern.id });
      await admin.from('shots').insert({ project_id: projectId, scene_id: sc.id, shot_number: '1' });
    }
    await admin.from('call_sheets').insert({ project_id: projectId, shoot_day: 1, shoot_date: '2030-01-15' });
    await expect(todo.getByText('1 element still needed or sourcing')).toBeVisible({ timeout: 20_000 });

    // Every location confirmed (Production › Locations).
    const places = Array.from(new Set((await admin.from('scenes').select('location').eq('project_id', projectId).is('removed_at', null)).data!.map((r) => String(r.location).toUpperCase())));
    // Each place already has a record (made with its scenes); lock them down.
    await admin.from('project_locations').upsert(places.map((name) => ({ project_id: projectId, name, status: 'confirmed', permit: 'not_needed' })), { onConflict: 'project_id,name' });
    await expect(todo.getByText(/^Lock down /)).toHaveCount(0, { timeout: 20_000 });
    await admin.from('breakdown_elements').update({ status: 'ready' }).eq('id', lantern.id);
    await expect(todo.getByText('Nothing blocking — every scene left to shoot is ready.')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('region', { name: 'Next shoot day' })).toContainText('all ready');
    await expect(page.getByRole('region', { name: 'Ready to shoot' })).toContainText(/2\s*of 2 scenes left to shoot/);
  });
});
