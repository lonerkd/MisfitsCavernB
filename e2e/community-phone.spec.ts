import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, devices } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Community on a phone (an iPhone 15 Pro, both ways up): the page never scrolls sideways and every control is a thumb's size.
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const PHONE = devices['iPhone 15 Pro'];
const SIDEWAYS = { ...PHONE, viewport: { width: 852, height: 393 }, screen: { width: 852, height: 393 } };

test.describe('Community on a phone (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');
  let admin: SupabaseClient; let userId = ''; let email = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    email = `cph.${Date.now()}@journey.test`;
    userId = (await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `cph${Date.now().toString(36)}` } })).data.user!.id;
    await admin.from('projects').insert({ title: 'Underground', creator_id: userId, status: 'production' });
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('creator_id', userId);
    await admin.auth.admin.deleteUser(userId);
  });

  for (const [name, device] of [['portrait', PHONE], ['landscape', SIDEWAYS]] as const) {
    test(`${name}: no sideways scroll, thumb-sized controls`, async ({ browser }) => {
      test.setTimeout(90_000);
      const ctx = await browser.newContext(device);
      const page = await ctx.newPage();
      await page.goto('/auth');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', PASSWORD);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
      await page.goto('/community');
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(1500);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
      const small = await page.evaluate(() => [...document.querySelectorAll('main button, main [role="button"], main [role="tab"], main a[href], main select, main input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])')]
        // A link's tappable area is its box plus 14 px above and below (the touch rule in globals.css).
        .map((el) => { const r = (el as HTMLElement).getBoundingClientRect(); return { n: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) + (el.tagName === 'A' ? 28 : 0) }; })
        .filter((x) => x.w > 0 && x.h > 0 && x.h < 40));
      expect(small, JSON.stringify(small)).toEqual([]);
      await ctx.close();
    });
  }
});
