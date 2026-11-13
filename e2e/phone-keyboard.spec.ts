import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, devices } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Every page is keyboard-safe on a phone: with the keyboard up (faked through `visualViewport`, the only thing the app reads) a
// field you tap ends above it, in both orientations, and the page leaves room to scroll to the last field. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const PHONE = devices['iPhone 15 Pro'];
const SIDEWAYS = { ...PHONE, viewport: { width: 852, height: 393 }, screen: { width: 852, height: 393 } };

test.describe('The keyboard on a phone (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');
  let admin: SupabaseClient;
  const me = { id: '', email: `phonekb.${TAG}@journey.test` };

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    me.id = (await admin.auth.admin.createUser({ email: me.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `pkb${TAG}` } })).data.user!.id;
  });
  test.afterAll(async () => { if (admin && me.id) await admin.auth.admin.deleteUser(me.id); });

  for (const [name, device, kb] of [['portrait', PHONE, 336], ['landscape', SIDEWAYS, 200]] as const) {
    test(`${name}: the field you tap on Settings ends above the keyboard`, async ({ browser }) => {
      test.setTimeout(90_000);
      const ctx = await browser.newContext(device);
      await ctx.addInitScript(() => {
        const w = window as unknown as { __kb: number; __setKb: (n: number) => void };
        w.__kb = 0;
        Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => ({ get height() { return window.innerHeight - w.__kb; }, offsetTop: 0, addEventListener() {}, removeEventListener() {} }) });
        w.__setKb = (n) => { w.__kb = n; window.dispatchEvent(new Event('resize')); };
      });
      const page = await ctx.newPage();
      await page.goto('/auth');
      await page.fill('input[name="email"]', me.email);
      await page.fill('input[name="password"]', PASSWORD);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
      await page.goto('/settings');
      const fields = page.locator('input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="hidden"]):not([type="color"]):visible, textarea:visible');
      await expect(fields.first()).toBeVisible({ timeout: 30_000 });
      const last = fields.last();
      await last.scrollIntoViewIfNeeded();
      await last.focus();
      await page.evaluate((n) => (window as unknown as { __setKb: (n: number) => void }).__setKb(n), kb);
      // The page marks itself, leaves room for the keyboard, and brings the field into the visible area.
      await expect(page.locator('html')).toHaveAttribute('data-typing', 'true');
      await expect.poll(async () => {
        const box = (await last.boundingBox())!;
        return box.y >= 0 && box.y + box.height <= page.viewportSize()!.height - kb;
      }, { timeout: 10_000 }).toBe(true);
      await page.evaluate(() => (window as unknown as { __setKb: (n: number) => void }).__setKb(0));
      await expect(page.locator('html')).not.toHaveAttribute('data-typing');
      await ctx.close();
    });
  }

  test('portrait: the Lounge composer sits on top of the keyboard, not under it', async ({ browser }) => {
    test.setTimeout(90_000);
    const ctx = await browser.newContext(PHONE);
    await ctx.addInitScript(() => {
      const w = window as unknown as { __kb: number; __setKb: (n: number) => void };
      w.__kb = 0;
      Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => ({ get height() { return window.innerHeight - w.__kb; }, offsetTop: 0, addEventListener() {}, removeEventListener() {} }) });
      w.__setKb = (n) => { w.__kb = n; window.dispatchEvent(new Event('resize')); };
    });
    const page = await ctx.newPage();
    await page.goto('/auth');
    await page.fill('input[name="email"]', me.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    await page.goto('/lounge');
    // The first channels are read-only guides: open channels until one has a composer.
    const channels = page.locator('.mc-lounge-channels button');
    await expect(channels.first()).toBeVisible({ timeout: 30_000 });
    const box = page.locator('.mc-lounge-composer textarea').first();
    for (let i = 0; i < await channels.count() && !(await box.isVisible()); i++) {
      if (!(await page.locator('.mc-lounge-channels').first().isVisible())) await page.locator('.mc-lounge-back').first().click();
      await channels.nth(i).click();
      await page.waitForTimeout(400);
    }
    await expect(box).toBeVisible({ timeout: 20_000 });
    await box.focus();
    await page.evaluate((n) => (window as unknown as { __setKb: (n: number) => void }).__setKb(n), 336);
    await expect(page.locator('html')).toHaveAttribute('data-typing', 'true');
    await expect.poll(async () => {
      const b = (await page.locator('.mc-lounge-composer').first().boundingBox())!;
      return b.y >= 0 && b.y + b.height <= page.viewportSize()!.height - 336 + 1;
    }, { timeout: 10_000 }).toBe(true);
    await ctx.close();
  });
});
