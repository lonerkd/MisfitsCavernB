import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Browser } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The Cavern as an installed iPhone app: every page names a launch screen for
// each iPhone size (and they exist), and Today tells an iPhone in Safari how
// to add it to the Home Screen — not once it's installed, and not after
// "Not now". Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const IPHONE = {
  viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
};

test.describe('Installing on iPhone (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const me = { id: '', email: `inst.${TAG}@journey.test` };

  const signIn = async (browser: Browser, opts: object, init?: string) => {
    const ctx = await browser.newContext(opts);
    if (init) await ctx.addInitScript(init);
    const page = await ctx.newPage();
    await page.goto('/auth');
    await page.fill('input[name="email"]', me.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    return page;
  };

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    me.id = (await admin.auth.admin.createUser({ email: me.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `inst${TAG}` } })).data.user!.id;
  });
  test.afterAll(async () => { if (me.id) await admin?.auth.admin.deleteUser(me.id); });

  test('every iPhone size has a launch screen', async ({ request }) => {
    const html = await (await request.get('/auth')).text();
    // Attribute order is the framework's; read each startup-image link's href and media.
    const urls = [...html.matchAll(/<link[^>]*rel="apple-touch-startup-image"[^>]*>/g)].map((m) => [m[0], m[0].match(/href="([^"]+)"/)![1], m[0].match(/media="([^"]+)"/)![1]]);
    expect(urls.length).toBe(11);
    expect(urls.map((m) => m[2]).join('|')).toContain('(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)');
    for (const [, href] of urls) {
      const res = await request.get(href);
      expect(res.status(), href).toBe(200);
      expect(res.headers()['content-type']).toContain('image/png');
    }
  });

  test('Today on an iPhone: how to add it to the Home Screen; Not now holds', async ({ browser }) => {
    test.setTimeout(120_000);
    const page = await signIn(browser, IPHONE);
    await page.goto('/today');
    const hint = page.getByRole('complementary', { name: 'Put The Cavern on your Home Screen' });
    await expect(hint).toContainText('Add to Home Screen', { timeout: 20_000 });
    await hint.getByRole('button', { name: 'Not now' }).click();
    await expect(hint).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 20_000 });
    await expect(hint).toHaveCount(0);
  });

  test('installed (standalone), or on a desk: no hint', async ({ browser }) => {
    test.setTimeout(120_000);
    const installed = await signIn(browser, IPHONE, 'Object.defineProperty(navigator, "standalone", { get: () => true });');
    await installed.goto('/today');
    await expect(installed.getByRole('heading').first()).toBeVisible({ timeout: 20_000 });
    await installed.waitForTimeout(1000);
    await expect(installed.getByRole('complementary', { name: 'Put The Cavern on your Home Screen' })).toHaveCount(0);

    const desk = await signIn(browser, { viewport: { width: 1280, height: 800 } });
    await desk.goto('/today');
    await expect(desk.getByRole('heading').first()).toBeVisible({ timeout: 20_000 });
    await desk.waitForTimeout(1000);
    await expect(desk.getByRole('complementary', { name: 'Put The Cavern on your Home Screen' })).toHaveCount(0);
  });
});
