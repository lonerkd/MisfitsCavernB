import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Browser, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The Production role tools in a real browser against a local stack: a crew member (not the owner) adds a permit and a
// camera report, they survive a reload, and the owner sees them; a viewer is refused and the form tells them so.
// Before 2026-11-08 every one of these saves failed for crew, because the lists lived in the owner-only project settings.
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Crew records (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const owner = { id: '', email: `cr-owner.${TAG}@journey.test`, name: `crowner${TAG}` };
  const crew = { id: '', email: `cr-crew.${TAG}@journey.test`, name: `crcrew${TAG}` };
  const viewer = { id: '', email: `cr-view.${TAG}@journey.test`, name: `crview${TAG}` };
  let projectId: string;

  const signIn = async (browser: Browser, who: typeof owner) => {
    const page = await (await browser.newContext()).newPage();
    await page.goto('/auth');
    await page.fill('input[name="email"]', who.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    return page;
  };

  // Choosing the project resets the Production tab to its first tool, so pick the tool after the project.
  const openView = async (page: Page, tool: string) => {
    await page.goto('/studio?tab=production');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    await page.getByText(tool, { exact: true }).first().click();
  };

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const who of [owner, crew, viewer]) {
      const { data } = await admin.auth.admin.createUser({ email: who.email, password: PASSWORD, email_confirm: true, user_metadata: { username: who.name } });
      who.id = data.user!.id;
    }
    projectId = (await admin.from('projects').insert({ title: `Records ${TAG}`, creator_id: owner.id, status: 'pre-production' }).select('id').single()).data!.id;
    const crewRows = await admin.from('project_crew').insert([
      { project_id: projectId, user_id: crew.id, craft: 'Camera operator', role: 'contributor', status: 'confirmed' },
      { project_id: projectId, user_id: viewer.id, craft: 'Production assistant', role: 'viewer', status: 'confirmed' },
    ]);
    if (crewRows.error) throw crewRows.error;
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
    for (const who of [owner, crew, viewer]) await admin.auth.admin.deleteUser(who.id);
  });

  test('crew add a permit, it survives a reload, and the owner sees it', async ({ browser }) => {
    const page = await signIn(browser, crew);
    await openView(page, 'Permits');
    await page.getByLabel('Location').fill('Pier 9');
    await page.getByRole('button', { name: /^add/i }).click();
    await expect(page.getByText('Pier 9')).toBeVisible();
    await page.reload();
    await page.getByLabel('Active project').waitFor();
    await expect(page.getByText('Pier 9')).toBeVisible();

    const ownerPage = await signIn(browser, owner);
    await openView(ownerPage, 'Permits');
    await expect(ownerPage.getByText('Pier 9')).toBeVisible();
    const rows = await admin.from('production_records').select('kind, created_by').eq('project_id', projectId);
    expect(rows.data).toEqual([{ kind: 'permits', created_by: crew.id }]);
  });

  test('a viewer is told the save was refused, and nothing is stored', async ({ browser }) => {
    const page = await signIn(browser, viewer);
    await openView(page, 'Permits');
    await page.getByLabel('Location').fill('Rooftop');
    await page.getByRole('button', { name: /^add/i }).click();
    await expect(page.getByText(/only the owner and crew who shape the project/i)).toBeVisible();
    await expect(page.getByLabel('Location')).toHaveValue('Rooftop');
    const rows = await admin.from('production_records').select('item_id').eq('project_id', projectId).contains('data', { location: 'Rooftop' });
    expect(rows.data).toEqual([]);
  });
});
