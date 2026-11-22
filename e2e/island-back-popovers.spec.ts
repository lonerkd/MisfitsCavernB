import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

// The island's back chevron returns to where you were (and climbs to the parent only on a fresh load); the
// menus that open above it stay inside the window; and its icon row never wraps. Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

const surface = (page: Page) => page.locator('[data-taskbar] .mc-taskbar');
const back = (page: Page) => page.locator('[data-taskbar]').getByRole('link', { name: /^Back to / });

test.describe('The island: back, popovers, icon row (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  const owner = { id: '', email: `islandback.${TAG}@journey.test` };
  let projectId: string;

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    owner.id = (await stack.createUser({ email: owner.email, password: PASSWORD, username: `islandback${TAG}` })).id;
    projectId = (await admin.from('projects').insert({ title: `Harbour ${TAG}`, creator_id: owner.id, status: 'production' }).select('id').single()).data!.id;
    await admin.from('channels').insert({ project_id: projectId, name: `general-${TAG}`, type: 'text' });
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
  });

  test('back returns to the previous page, and to the parent on a fresh load', async ({ browser }) => {
    test.setTimeout(150_000);
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 700 } });
    const page = await ctx.newPage();
    await signInAs(page, { email: owner.email, password: PASSWORD });

    await page.goto(`/studio?project=${projectId}`);
    await page.waitForURL(/\/studio/);
    await expect(page.locator('[data-taskbar]')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    await surface(page).hover();
    await page.locator('[data-taskbar]').getByRole('link', { name: 'Lounge', exact: true }).click();
    await page.waitForURL(/\/lounge/);
    await page.waitForTimeout(800);
    await surface(page).hover();
    await expect(back(page)).toHaveAttribute('aria-label', /Back to Studio/i);
    await back(page).click();
    await page.waitForURL(/\/studio/);
    expect(new URL(page.url()).pathname).not.toBe('/projects');

    // A fresh load has no earlier page: back climbs to the parent.
    const fresh = await ctx.newPage(); // a new tab: its history holds only this page
    await fresh.goto('/lounge');
    await fresh.waitForTimeout(1500);
    await surface(fresh).hover();
    await expect(back(fresh)).toHaveAttribute('href', /\/projects/);
    await expect(back(fresh)).toHaveAttribute('aria-label', /Back to (Projects|Project)/);
  });

  test('the phone pill is fully shown or fully gone while scrolling, never half faded', async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await signInAs(page, { email: owner.email, password: PASSWORD });
    await page.goto(`/projects/${projectId}`);
    const pill = page.locator('[data-mobile-tabbar]');
    await expect(pill).toBeVisible({ timeout: 30_000 });
    for (const y of [0, 400, 1200, 300, 0]) {
      await page.evaluate((to) => window.scrollTo(0, to), y);
      await page.waitForTimeout(350);
      const s = await pill.evaluate((el) => { const c = getComputedStyle(el); const r = el.getBoundingClientRect(); return { opacity: c.opacity, visibility: c.visibility, bottom: r.bottom, vh: window.innerHeight }; });
      const shown = s.opacity === '1' && s.visibility === 'visible' && s.bottom <= s.vh;
      const gone = s.visibility === 'hidden' || s.bottom > s.vh;
      expect(shown || gone, `scrollY ${y}: ${JSON.stringify(s)}`).toBe(true);
      expect(s.opacity, 'never half faded').toBe('1');
    }
  });

  test('menus above the island stay on screen; the icon row does not wrap', async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 700 } });
    const page = await ctx.newPage();
    await signInAs(page, { email: owner.email, password: PASSWORD });
    await page.goto('/projects');
    await page.waitForTimeout(1500);
    await surface(page).hover();
    await page.waitForTimeout(700);

    // One row: every icon in the nav shares a y.
    const ys = await page.evaluate(() => [...document.querySelectorAll('[data-taskbar] .mc-app-strip a, [data-taskbar] a[aria-label="Settings"], [data-taskbar] a[aria-label="Front page"], [data-taskbar] a[aria-label="Profile"], [data-taskbar] button[aria-label="Switch project"]')]
      .map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(ys.length).toBeGreaterThan(3);
    expect(Math.max(...ys) - Math.min(...ys), 'icons share one row').toBeLessThanOrEqual(4);

    for (const open of [
      async () => page.getByRole('button', { name: /^Notifications/ }).click(),
      async () => page.getByRole('button', { name: 'Switch project' }).click(),
    ]) {
      await open();
      await page.waitForTimeout(500);
      const popover = page.locator('.notif-panel, [role="listbox"][aria-label="Projects"]').first();
      await expect(popover).toBeVisible();
      const box = (await popover.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(700);
      await page.keyboard.press('Escape');
      await page.mouse.click(10, 300);
      await page.waitForTimeout(300);
      await surface(page).hover();
      await page.waitForTimeout(500);
    }
  });
});
