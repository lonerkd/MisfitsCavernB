import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Role model: the owner's notification for "asks for access" opens the crew screen with a one-click Grant. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await (window as any).axe.run(document.querySelector('[aria-label="Request for access"]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] }, resultTypes: ['violations'] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return r.violations.map((v: any) => v.id);
  });
}

test.describe('Granting a request in one click (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');
  let admin: SupabaseClient;
  const owner = { id: '', email: `grantmo.${TAG}@journey.test` };
  const crew = { id: '', email: `grantmc.${TAG}@journey.test` };
  let projectId = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    owner.id = (await admin.auth.admin.createUser({ email: owner.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `grantmo${TAG}` } })).data.user!.id;
    crew.id = (await admin.auth.admin.createUser({ email: crew.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `grantmc${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Grant ${TAG}`, creator_id: owner.id, status: 'pre-production' }).select('id').single()).data!.id;
    await admin.from('project_crew').insert({ project_id: projectId, user_id: crew.id, role: 'contributor', craft: 'Casting director', status: 'confirmed' });
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('crew_capability_overrides').delete().eq('project_id', projectId);
    await admin.from('notifications').delete().eq('user_id', owner.id);
    await admin.from('project_crew').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    for (const id of [owner.id, crew.id]) if (id) await admin.auth.admin.deleteUser(id);
  });

  test('the request names the person and the permission, and one click grants it', async ({ page }) => {
    test.setTimeout(120_000);
    const link = `/studio?project=${projectId}&tab=production&view=crew&grant=${crew.id}.budget.read`;
    await page.goto('/auth');
    await page.fill('input[name="email"]', owner.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    await page.goto(link);

    const bar = page.getByRole('status', { name: 'Request for access' });
    await expect(bar).toContainText(`grantmc${TAG} asked for access`, { timeout: 30_000 });
    await expect(bar).toContainText('see the budget');
    expect(await axeViolations(page)).toEqual([]);

    await bar.getByRole('button', { name: /Grant see the budget/i }).click();
    await expect(bar).toContainText('Granted', { timeout: 30_000 });
    await expect.poll(async () => (await admin.from('crew_capability_overrides').select('granted').eq('project_id', projectId).eq('user_id', crew.id).eq('capability', 'budget.read')).data?.[0]?.granted, { timeout: 30_000 }).toBe(true);
  });
});
