import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Layout guard at desk size: the island never hides anything, and never costs
// the page its bottom edge. Opened, every app in its strip is fully visible; at
// rest, the controls at the foot of full-height screens (the Lounge composer
// and Send, the editor's footer) sit above it while the lists and panels either
// side run to the foot of the screen. These broke silently once; this keeps
// them from breaking again.
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

    // Opened, every app in the island's strip is whole and on screen.
    await page.goto('/today');
    await expect(page.locator('[data-taskbar]')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1500); // the island animates in
    await page.locator('[data-taskbar] .mc-taskbar').hover();
    await expect(page.locator('.mc-app-strip a').first()).toBeVisible();
    await page.waitForTimeout(600); // and opens
    const clipped = await page.evaluate(() => {
      const island = document.querySelector('[data-taskbar] .mc-taskbar')!.getBoundingClientRect();
      const apps = [...document.querySelectorAll('.mc-app-strip a')].map((a) => a.getBoundingClientRect());
      if (apps.length < 2 || island.left < 0 || island.right > innerWidth || island.bottom > innerHeight) return -1;
      return apps.filter((r) => r.width < 40 || r.left < island.left - 1 || r.right > island.right + 1).length;
    });
    expect(clipped, 'apps cut off at the edge of the island').toBe(0);
    await page.mouse.move(10, 10);
    await expect(page.locator('[data-taskbar]')).toHaveAttribute('data-island', 'rest');

    // The dock tells pages how much room it takes.
    const reserved = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--taskbar-height')));
    expect(reserved).toBeGreaterThan(40);

    // Lounge, with a channel list taller than the screen: the composer and Send
    // end above the dock, on screen — not under it or pushed below it.
    await page.goto('/lounge');
    await expect(page.locator('.mc-lounge-composer')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(`dept-17-${TAG}`)).toBeAttached({ timeout: 20_000 });
    await expect(page.locator('[data-taskbar] .mc-taskbar')).toBeVisible({ timeout: 30_000 });
    expect(await belowDockTop(page, '.mc-lounge-composer'), 'Lounge composer under the dock').toBe(0);
    // …and the island costs the page nothing else: the channel list runs to the foot of the screen.
    const listGap = await page.evaluate(() => Math.round(innerHeight - document.querySelector('.mc-lounge-channels')!.getBoundingClientRect().bottom));
    expect(listGap, 'Lounge channel list stops short of the foot of the screen').toBeLessThanOrEqual(1);

    // Editor: its footer (the line-type hint) is above the dock.
    await page.goto(`/editor?script=${scriptId}`);
    await expect(page.getByText('Night', { exact: false }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-taskbar] .mc-taskbar')).toBeVisible({ timeout: 30_000 });
    const footerCovered = await page.evaluate(() => {
      const dock = document.querySelector('[data-taskbar] .mc-taskbar')!.getBoundingClientRect();
      const root = document.querySelector('.mc-editor-center') as HTMLElement | null;
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
