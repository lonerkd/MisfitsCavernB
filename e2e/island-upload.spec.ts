import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, chromium } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The island holds an upload while it goes up, with how far along it is (BACKLOG 4.1). Real browser, real local
// stack; the upload is slowed with the browser's own network throttle so it can be watched.
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('The island holds an upload (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId = '';
  let projectId = '';
  const email = `upl.${TAG}@journey.test`;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    userId = (await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `upl${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Upload ${TAG}`, creator_id: userId, status: 'production' }).select('id').single()).data!.id;
  });
  test.afterAll(async () => {
    if (!admin) return;
    const { data: files } = await admin.from('media').select('storage_path').eq('project_id', projectId);
    const paths = (files ?? []).map((f) => f.storage_path).filter(Boolean) as string[];
    if (paths.length) await admin.storage.from('project-media').remove(paths);
    await admin.from('projects').delete().eq('id', projectId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  test('a slow upload shows on the island with its progress, then lets go and the item is in the library', async () => {
    test.setTimeout(120_000);
    const browser = await chromium.launch({ executablePath: process.env.MC_LOCAL_CHROMIUM });
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    const page = await ctx.newPage();
    try {
      await page.goto('/auth');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', PASSWORD);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
      await page.goto('/studio?tab=library');
      const picker = page.getByLabel('Active project');
      await picker.waitFor();
      if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);

      // 1.5 MB at about 250 kB/s: a few seconds on the way up.
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: 250 * 1024 });
      const island = page.getByRole('navigation', { name: 'Suite' });
      await expect(island.getByText(/^Uploading /)).toHaveCount(0); // nothing running, nothing held

      await page.locator('input[type="file"]').first().setInputFiles({ name: 'slowreel.png', mimeType: 'image/png', buffer: Buffer.alloc(1_500_000, 7) });
      await expect(island.getByText('Uploading slowreel.png')).toBeVisible({ timeout: 15_000 });
      await expect(island.getByText(/\d+% · /)).toBeVisible();

      // It lets go of the island when the upload is done, and the item is in the library.
      await expect(island.getByText(/^Uploading /)).toHaveCount(0, { timeout: 60_000 });
      await expect(page.getByRole('button', { name: 'slowreel — Image' })).toBeVisible({ timeout: 30_000 });
      const { data: rows } = await admin.from('media').select('storage_path, size_bytes').eq('project_id', projectId);
      expect(rows).toHaveLength(1);
      expect(rows![0].size_bytes).toBe(1_500_000);
    } finally { await ctx.close(); await browser.close(); }
  });
});
