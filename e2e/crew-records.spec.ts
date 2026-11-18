import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { Browser, Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

// The Production role tools in a real browser against a local stack: a crew member (not the owner) adds a permit and a
// camera report, they survive a reload, and the owner sees them; a viewer is refused and the form tells them so.
// Before 2026-11-08 every one of these saves failed for crew, because the lists lived in the owner-only project settings.
// Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Crew records (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  const owner = { id: '', email: `cr-owner.${TAG}@journey.test`, name: `crowner${TAG}` };
  const crew = { id: '', email: `cr-crew.${TAG}@journey.test`, name: `crcrew${TAG}` };
  const viewer = { id: '', email: `cr-view.${TAG}@journey.test`, name: `crview${TAG}` };
  let projectId: string;

  const signIn = async (browser: Browser, who: typeof owner) => {
    const page = await (await browser.newContext()).newPage();
    await signInAs(page, { email: who.email, password: PASSWORD });
    return page;
  };

  // Choosing the project resets the Production tab to its first tool, so pick the tool after the project.
  const openView = async (page: Page, tool: string) => {
    await page.goto('/studio?tab=production');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    // The tool list opens on a press (BACKLOG 3.47): open it, then pick the tool.
    const all = page.getByRole('button', { name: /^All tools/ });
    await all.waitFor();
    if ((await all.getAttribute('aria-expanded')) === 'false') await all.click();
    await page.getByText(tool, { exact: true }).first().click();
    // Choosing a tool closes the list, so the tool is in view.
    await expect(all).toHaveAttribute('aria-expanded', 'false');
  };

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    for (const who of [owner, crew, viewer]) {
      const data = await stack.createUser({ email: who.email, password: PASSWORD, username: who.name });
      who.id = data.id;
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
