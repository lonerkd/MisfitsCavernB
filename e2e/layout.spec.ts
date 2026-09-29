import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Layout guard at desk size: the floating dock never hides anything. Every app
// in its strip is fully visible, and the controls at the bottom of full-height
// screens (the Lounge composer and Send, the editor's footer) sit above it.
// These broke silently once; this keeps them from breaking again.
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const DESK = { viewport: { width: 1440, height: 900 } };

/** How far `el` reaches below the top of the dock, in px (0 when it ends above it). */
const belowDockTop = (page: Page, selector: string) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  const dock = document.querySelector('[data-taskbar] .mc-taskbar');
  if (!el || !dock) return -1;
  return Math.max(0, Math.round(el.getBoundingClientRect().bottom - dock.getBoundingClientRect().top));
}, selector);

test.describe('Layout guard at desk size (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const owner = { id: '', email: `layout.${TAG}@journey.test` };
  let projectId: string, scriptId: string;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    owner.id = (await admin.auth.admin.createUser({ email: owner.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `layout${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Harbour ${TAG}`, creator_id: owner.id, status: 'production' }).select('id').single()).data!.id;
    // A busy project: enough channels that the Lounge's channel list is taller than the screen.
    await admin.from('channels').insert(Array.from({ length: 18 }, (_, i) => ({ project_id: projectId, name: `dept-${i}-${TAG}`, type: 'text' })));
    scriptId = (await admin.from('scripts').insert({ title: `Harbour ${TAG}`, content: 'INT. HARBOUR - NIGHT\n\nWaves.\n', project_id: projectId, created_by: owner.id, last_edited_by: owner.id }).select('id').single()).data!.id;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('id', scriptId);
    await admin.from('projects').delete().eq('id', projectId);
    await admin.auth.admin.deleteUser(owner.id);
  });

  test('the dock hides nothing', async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await browser.newContext(DESK);
    const page = await ctx.newPage();
    await page.goto('/auth');
    await page.fill('input[name="email"]', owner.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    // Every app icon in the dock's strip is whole — none cut off at the ends.
    await page.goto('/today');
    await expect(page.locator('[data-taskbar]')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1500); // the dock animates in
    const clipped = await page.evaluate(() => {
      const strip = document.querySelector('.mc-app-carousel')!.getBoundingClientRect();
      return [...document.querySelectorAll('.mc-app-carousel a')]
        .map((a) => a.getBoundingClientRect())
        .filter((r) => r.right > strip.left + 1 && r.left < strip.right - 1) // at least partly in view
        .filter((r) => r.left < strip.left - 1 || r.right > strip.right + 1).length;
    });
    expect(clipped, 'apps cut off at the edge of the dock').toBe(0);

    // The dock tells pages how much room it takes.
    const reserved = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--taskbar-height')));
    expect(reserved).toBeGreaterThan(40);

    // Lounge, with a channel list taller than the screen: the composer and Send
    // end above the dock, on screen — not under it or pushed below it.
    await page.goto('/lounge');
    await expect(page.locator('.mc-lounge-composer')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(`dept-17-${TAG}`)).toBeAttached({ timeout: 20_000 });
    expect(await belowDockTop(page, '.mc-lounge-composer'), 'Lounge composer under the dock').toBe(0);

    // Editor: its footer (the line-type hint) is above the dock.
    await page.goto(`/editor?script=${scriptId}`);
    await expect(page.getByText('Night', { exact: false }).first()).toBeVisible({ timeout: 30_000 });
    const footerCovered = await page.evaluate(() => {
      const dock = document.querySelector('[data-taskbar] .mc-taskbar')!.getBoundingClientRect();
      const root = document.querySelector('#main-content > div') as HTMLElement | null;
      return root ? Math.round(Math.max(0, root.getBoundingClientRect().bottom - parseFloat(getComputedStyle(root).paddingBottom) - dock.top)) : -1;
    });
    expect(footerCovered, 'editor content runs under the dock').toBe(0);

    // Nothing scrolls sideways at desk size.
    for (const path of ['/today', '/projects', `/projects/${projectId}`, '/studio', '/lounge', '/jobs', '/crew']) {
      await page.goto(path);
      await page.waitForTimeout(800);
      const sideways = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(sideways, `${path} scrolls sideways`).toBeLessThanOrEqual(1);
    }
    await ctx.close();
  });
});
