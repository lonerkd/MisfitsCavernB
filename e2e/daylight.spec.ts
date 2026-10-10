import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The film graph, step 1, in a real browser against a local stack: a location
// is told where it is, and the day's light shows on the location, on the
// stripboard (with a warning when the plan runs past it) and on the call
// sheet. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const SCRIPT = 'EXT. HARBOR - DAY\n\nBoats come in.\n\nEXT. HARBOR - DAY\n\nThe last boat.\n';

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

test.describe.serial('Daylight (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId: string;
  const email = `light.${TAG}@journey.test`;
  let projectId: string;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    userId = (await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `light${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Harbor ${TAG}`, creator_id: userId, status: 'pre-production' }).select('id').single()).data!.id;
    await admin.from('scripts').insert({ title: 'Harbor', content: SCRIPT, project_id: projectId, created_by: userId, last_edited_by: userId });
    await admin.from('shoot_days').insert({ project_id: projectId, day_number: 1, shoot_date: '2026-06-21' });
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    await admin.auth.admin.deleteUser(userId);
  });

  async function open(page: Page, view: string) {
    await page.goto('/auth');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    await page.goto(`/studio?tab=production&view=${view}`);
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
  }

  test('a location is told where it is, and shows its light', async ({ page }) => {
    test.setTimeout(120_000);
    await open(page, 'locations');
    const harbor = page.getByRole('button', { name: /^HARBOR/ });
    await expect(harbor).toContainText('2 scenes', { timeout: 30_000 });
    await harbor.click();

    // Nothing to compute from yet: it asks, it doesn't show an empty sun.
    await expect(page.getByText('Add where this is to see its light.')).toBeVisible();
    const where = page.getByLabel('Coordinates or a map link');
    await where.fill('the old harbour');
    await where.press('Enter');
    await expect(page.getByText('That doesn’t look like coordinates.')).toBeVisible();

    await where.fill('https://www.google.com/maps/@51.0447,-114.0719,15z');
    await where.press('Enter');
    await expect(page.getByText('51.0447, -114.0719')).toBeVisible();
    // Arizona's clock never changes, so the times below don't depend on a machine's time zone rules.
    // Arizona's clock never changes, so the times here don't depend on a machine's time zone rules.
    await page.getByLabel('HARBOR time zone').selectOption('America/Phoenix');
    await expect.poll(async () => (await admin.from('project_locations').select('latitude, longitude, timezone').eq('project_id', projectId).eq('name', 'HARBOR').single()).data)
      .toEqual({ latitude: 51.0447, longitude: -114.0719, timezone: 'America/Phoenix' });

    const light = page.getByRole('list', { name: 'HARBOR light on its shoot days' });
    await expect(light).toContainText('Day 1');
    await expect(light).toContainText(/sunrise 04:2\d/);
    await expect(light).toContainText(/sunset 20:5\d/);

    await page.reload();
    await page.getByRole('button', { name: /^HARBOR/ }).click();
    await expect(page.getByRole('list', { name: 'HARBOR light on its shoot days' })).toContainText(/sunrise 04:2\d/);
    expect(await axeViolations(page)).toEqual([]);
  });

  test('the stripboard shows each day’s date and light, and warns when the plan runs past it', async ({ page }) => {
    test.setTimeout(120_000);
    await open(page, 'schedule');
    const day1 = page.getByRole('region', { name: 'Day 1' });
    await expect(day1.getByLabel('Day 1 date')).toHaveValue('2026-06-21', { timeout: 30_000 });
    await expect(day1).toContainText(/04:2\d – 20:5\d/);

    // Midwinter: the same harbour has less than eight hours of light.
    await day1.getByLabel('Day 1 date').fill('2026-12-21');
    await day1.getByLabel('Day 1 date').blur();
    await expect.poll(async () => (await admin.from('shoot_days').select('shoot_date').eq('project_id', projectId).eq('day_number', 1).single()).data?.shoot_date).toBe('2026-12-21');
    await expect(day1).toContainText(/08:3\d – 16:3\d/);
    await expect(day1.getByText(/light ends/)).toHaveCount(0);

    // A wrap after sunset, set on the call sheet, reaches the board live.
    await admin.from('call_sheets').upsert({ project_id: projectId, shoot_day: 1, shooting_call: '09:00', estimated_wrap: '18:00' }, { onConflict: 'project_id,shoot_day' });
    await expect(day1.getByText(/2 exterior day scenes, but the light ends at 16:3\d and wrap is 18:00\./)).toBeVisible({ timeout: 20_000 });
    expect(await axeViolations(page)).toEqual([]);
  });

  test('the call sheet carries the light', async ({ page }) => {
    test.setTimeout(120_000);
    await open(page, 'schedule');
    await page.getByRole('button', { name: /^DAY 1/ }).click();
    const sheet = page.getByRole('group', { name: 'Day 1 light' });
    await expect(sheet).toContainText(/Sunrise 08:3\d/, { timeout: 30_000 });
    await expect(sheet).toContainText(/Sunset 16:3\d/);
    await expect(sheet).toContainText('America/Phoenix');
  });
});
