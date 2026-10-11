import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Locations in a real browser against a local stack: the script's locations
// listed, one filled in and confirmed, its address offered on the call
// sheet. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const SCRIPT = 'INT. CAVE - NIGHT\n\nSam lights the lantern.\n\nEXT. RIDGE - DAWN\n\nWind over the ridge.\n\nINT. CAVE - NIGHT\n\nThe lantern gutters.\n';

async function axeViolations(page: Page): Promise<string[]> {
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
    .map((a) => a.finished.catch(() => undefined))));
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)} ${n.any?.[0]?.message ?? ''}`).join(' | ')}`);
  });
}

test.describe('Locations (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId: string;
  const email = `loc.${TAG}@journey.test`;
  let projectId: string;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    userId = (await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `loc${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Ridge ${TAG}`, creator_id: userId, status: 'pre-production' }).select('id').single()).data!.id;
    await admin.from('scripts').insert({ title: 'Ridge', content: SCRIPT, project_id: projectId, created_by: userId, last_edited_by: userId });
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    await admin.auth.admin.deleteUser(userId);
  });

  test('the script’s locations → fill one in → its address on the call sheet', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/auth');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    await page.goto('/studio?tab=production&view=locations');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);

    // Busiest first: CAVE (2 scenes), then RIDGE.
    const cave = page.getByRole('button', { name: /^CAVE/ });
    await expect(cave).toContainText('2 scenes', { timeout: 30_000 });
    await expect(page.getByRole('button', { name: /^RIDGE/ })).toContainText('exterior');
    await expect(page.getByText('0 of 2 locked down')).toBeVisible();

    await cave.click();
    await page.getByLabel('Address').fill('1 Cave Rd');
    await page.getByLabel('Address').blur();
    await page.getByRole('radiogroup', { name: 'CAVE status' }).getByRole('radio', { name: 'Confirmed' }).click();
    await page.getByLabel('CAVE permit').selectOption('not_needed');
    await expect.poll(async () => (await admin.from('project_locations').select('name, address, status, permit').eq('project_id', projectId).order('name')).data)
      // Every place the script names has a record (the film graph); only CAVE has been filled in.
      .toEqual([{ name: 'CAVE', address: '1 Cave Rd', status: 'confirmed', permit: 'not_needed' }, { name: 'RIDGE', address: null, status: 'scouting', permit: 'unknown' }]);
    await expect(page.getByText('1 of 2 locked down')).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
    await page.screenshot({ path: 'test-results/locations.png', fullPage: true });

    // The call sheet offers the address of the day's location.
    await page.goto('/studio?tab=production&view=schedule');
    await page.getByRole('button', { name: /^DAY 1/ }).click({ timeout: 20_000 });
    await expect(page.getByText('CAVE is at 1 Cave Rd.')).toBeVisible();
    await page.getByRole('button', { name: 'Use this address' }).click();
    await expect.poll(async () => (await admin.from('call_sheets').select('location_address').eq('project_id', projectId).eq('shoot_day', 1).maybeSingle()).data?.location_address)
      .toBe('1 Cave Rd');
  });
});
