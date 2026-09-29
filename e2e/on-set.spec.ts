import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// On set against a local stack: today's call sheet, stamp the clock, tick a
// shot, wrap the scene, log continuity and a day note. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const SCRIPT = 'INT. CAVE - NIGHT\n\nSam lights a match.\n\nEXT. RIDGE - DAWN\n\nMaya climbs.\n';
const d = new Date();
const TODAY = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)} ${n.any?.[0]?.message ?? ''}`).join(' | ')}`);
  });
}

test.describe('On set (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId: string;
  let email: string;
  let projectId: string;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    email = `os.${Date.now()}@journey.test`;
    const { data } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `os${Date.now().toString(36)}` } });
    userId = data.user!.id;
    projectId = (await admin.from('projects').insert({ title: 'Shoot', creator_id: userId, status: 'production' }).select('id').single()).data!.id;
    await admin.from('scripts').insert({ title: 'Shoot', content: SCRIPT, project_id: projectId, created_by: userId, last_edited_by: userId });
    await admin.from('call_sheets').insert({ project_id: projectId, shoot_day: 1, shoot_date: TODAY, general_call: '07:00', estimated_wrap: '19:00', location_address: 'Quarry Rd' });
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    await admin.auth.admin.deleteUser(userId);
  });

  test('the day on set: clock, shots, wrap, continuity', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    // Open the Studio so the scene index is built, then schedule scene 1 on day 1 with a shot.
    await page.goto('/studio?tab=production&view=onset');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    await expect.poll(async () => (await admin.from('scenes').select('id').eq('project_id', projectId).is('removed_at', null)).data?.length, { timeout: 20_000 }).toBe(2);
    const scene = (await admin.from('scenes').select('id').eq('project_id', projectId).order('scene_number').limit(1).single()).data!.id;
    await admin.from('scenes').update({ shoot_day: 1 }).eq('id', scene);
    await admin.from('shots').insert({ project_id: projectId, scene_id: scene, shot_number: '1.1', shot_size: 'CU', created_by: userId });
    await page.reload();

    // The day's own "Today" eyebrow — not the phone tab bar's Today link, which is in the page too.
    await expect(page.getByLabel(/^Day 1 — /).getByText('Today', { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /^Day 1 — / })).toBeVisible();
    const card = page.getByRole('article', { name: /^Scene 1:/ });
    await expect(card).toBeVisible({ timeout: 20_000 });

    // Stamp crew call.
    await page.getByRole('button', { name: 'Crew call: stamp now' }).click();
    await expect(page.getByRole('button', { name: /^Crew call at / })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Crew in — setting up/)).toBeVisible();

    // Got the shot; the scene starts; wrap it.
    await card.getByRole('button', { name: 'Shot 1.1: mark got' }).click();
    await expect(card.getByRole('button', { name: 'Shot 1.1: got it — undo' })).toHaveAttribute('aria-pressed', 'true', { timeout: 10_000 });
    await expect.poll(async () => (await admin.from('shots').select('status').eq('scene_id', scene).single()).data?.status).toBe('shot');
    await expect.poll(async () => (await admin.from('scenes').select('status').eq('id', scene).single()).data?.status).toBe('shot');
    await card.getByRole('button', { name: 'Wrap scene' }).click();
    await expect.poll(async () => (await admin.from('scenes').select('status').eq('id', scene).single()).data?.status).toBe('wrapped');
    await expect(page.getByRole('progressbar', { name: 'Scenes' })).toHaveAttribute('aria-valuenow', '1');

    // Continuity for shot 1.1, take 2.
    await card.getByRole('button', { name: /^Continuity · 0/ }).click();
    await card.getByLabel('Continuity note for scene 1').fill('Match in left hand');
    await card.getByLabel('Shot', { exact: true }).selectOption({ label: 'Shot 1.1' });
    await card.getByLabel('Take').fill('2');
    await card.getByRole('button', { name: 'Log' }).click();
    await expect(card.getByText('Match in left hand')).toBeVisible({ timeout: 10_000 });
    await expect(card.getByText(/shot 1\.1 · take 2/)).toBeVisible();

    // A note for the day lands in the log.
    await page.getByLabel('Note for the day').fill('Lost 20 min to rain');
    await page.getByRole('button', { name: 'Note', exact: true }).click();
    const log = page.getByRole('region', { name: 'The day’s log' });
    await expect(log).toContainText('Lost 20 min to rain', { timeout: 10_000 });
    await expect(log).toContainText('Crew call');

    await page.waitForTimeout(600);
    expect(await axeViolations(page)).toEqual([]);
  });
});
