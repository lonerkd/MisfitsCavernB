import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, chromium } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The film graph, step 3 (BACKLOG 3.18): the Studio reads a scene's place through its link, so renaming a
// location renames it for the scenes that point at it, and the old name does not come back as a second row.
// Real data, no mocks. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const SCRIPT = 'INT. KITCHEN - DAY\n\nMAYA stirs a pot.\n\nINT. GARAGE - NIGHT\n\nBEN sorts tools.\n';

test.describe('Renaming a location (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId = '';
  let projectId = '';
  const email = `place.${TAG}@journey.test`;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    userId = (await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `place${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Place ${TAG}`, creator_id: userId, status: 'pre-production' }).select('id').single()).data!.id;
    await admin.from('scripts').insert({ title: 'Kitchen', content: SCRIPT, project_id: projectId, created_by: userId, last_edited_by: userId });
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  test('a renamed place keeps its scenes and shows once, after a reload too', async () => {
    test.setTimeout(120_000);
    const browser = await chromium.launch({ executablePath: process.env.MC_LOCAL_CHROMIUM });
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await ctx.newPage();
    try {
      await page.goto('/auth');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', PASSWORD);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
      await page.goto('/studio?tab=production&view=locations');
      const picker = page.getByLabel('Active project');
      await picker.waitFor();
      if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);

      await page.getByRole('button', { name: /KITCHEN/ }).click();
      const name = page.getByLabel(/Name \(every scene at this place follows\)/);
      await name.fill('Diner');
      await name.blur();

      await expect(page.getByRole('button', { name: /DINER/ })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole('button', { name: /KITCHEN/ })).toHaveCount(0);
      const rows = (await admin.from('project_locations').select('name').eq('project_id', projectId)).data!.map((r) => r.name).sort();
      expect(rows).toEqual(['DINER', 'GARAGE']);
      // The scene still points at the same place, whatever its heading says.
      const scene = (await admin.from('scenes').select('location, project_locations(name)').eq('project_id', projectId).eq('location', 'KITCHEN').single()).data as unknown as { project_locations: { name: string } };
      expect(scene.project_locations.name).toBe('DINER');

      await page.reload();
      await expect(page.getByRole('button', { name: /DINER/ })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('button', { name: /KITCHEN/ })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /DINER/ })).toContainText('1 scene');
    } finally { await ctx.close(); await browser.close(); }
  });
});
