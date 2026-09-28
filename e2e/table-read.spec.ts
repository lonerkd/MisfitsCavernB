import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Runtime in the editor's Stats view against a local stack: printed-page
// estimates per scene, a scene timed at a table read replaces its estimate and
// calibrates the rest, and each row jumps to its scene. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const SCRIPT = [
  'INT. CAVE - NIGHT', '', 'Sam lights a match. The walls glitter.', '',
  'SAM', 'Who’s there?', '',
  'EXT. RIDGE - DAWN', '', 'Maya climbs into the light.', '',
  'MAYA', '(breathless)', 'You came back for me after all this time.', '',
].join('\n');

async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)} ${n.any?.[0]?.message ?? ''}`).join(' | ')}`);
  });
}

test.describe('Table read & runtime (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId: string;
  let email: string;
  let projectId: string;
  let scriptId: string;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    email = `tr.${Date.now()}@journey.test`;
    const { data } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `tr${Date.now().toString(36)}` } });
    userId = data.user!.id;
    projectId = (await admin.from('projects').insert({ title: 'Table read', creator_id: userId, status: 'pre-production' }).select('id').single()).data!.id;
    scriptId = (await admin.from('scripts').insert({ title: 'Table read', content: SCRIPT, project_id: projectId, created_by: userId, last_edited_by: userId }).select('id').single()).data!.id;
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.auth.admin.deleteUser(userId);
  });

  test('runtime per scene, a timed scene calibrates the rest, rows jump to the scene', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    await page.goto(`/editor?script=${scriptId}`);
    await expect(page.getByLabel('Script', { exact: true })).toHaveCount(1, { timeout: 20_000 });

    // The editor indexes the scenes; record a table-read time on the first.
    await expect.poll(async () => (await admin.from('scenes').select('id').eq('project_id', projectId).is('removed_at', null)).data?.length, { timeout: 20_000 }).toBe(2);
    const first = (await admin.from('scenes').select('id').eq('project_id', projectId).order('scene_number').limit(1).single()).data!.id;
    await admin.from('scenes').update({ read_seconds: 30, read_at: new Date().toISOString() }).eq('id', first);
    await page.reload();
    await expect(page.getByLabel('Script', { exact: true })).toHaveCount(1, { timeout: 20_000 });

    // The project pill arrives a beat after the script and shifts the view
    // switcher right; click once the header has settled.
    await expect(page.locator(`header a[href="/projects/${projectId}"]`)).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Stats', exact: true }).click();
    const runtime = page.getByRole('region', { name: 'Runtime' });
    await expect(runtime).toContainText('1 scene timed at a table read', { timeout: 20_000 });
    const table = runtime.getByRole('table', { name: 'Runtime by scene' });
    await expect(table.getByRole('row')).toHaveCount(3);
    await expect(table.getByRole('row').nth(1)).toContainText('30s');
    await expect(runtime.getByRole('table', { name: 'Dialogue by character' })).toContainText('MAYA');

    await page.waitForTimeout(1000);
    expect(await axeViolations(page)).toEqual([]);

    // A row jumps to its scene in the script.
    await table.getByRole('button', { name: /^2\. EXT\. RIDGE - DAWN/ }).click();
    const ta = page.getByLabel('Script', { exact: true });
    await expect(ta).toHaveCount(1, { timeout: 20_000 });
    await expect.poll(() => ta.evaluate((el) => {
      const t = el as HTMLTextAreaElement;
      return t.value.slice(0, t.selectionStart).split('\n').length - 1;
    }), { timeout: 10_000 }).toBe(7);
  });
});
