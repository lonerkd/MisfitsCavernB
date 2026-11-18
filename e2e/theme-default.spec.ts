import { test, expect, type Page } from '@playwright/test';

// What a person who has never chosen a theme sees follows their device (owner, 2026-11-18): Paper on a light one, Misfit on a
// dark one, and it changes with the device. A saved choice always wins. Needs no account: /auth is public and carries the
// same theme machinery as every page. (The rest of the suite runs on a dark device, set in playwright.config.ts.)
const theme = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme);

test.describe('The default theme follows the device', () => {
  test('a light device with no saved choice gets Paper', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'light' });
    const page = await ctx.newPage();
    await page.goto('/auth');
    expect(await theme(page)).toBe('paper');
    await ctx.close();
  });

  test('a dark device with no saved choice gets Misfit', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.goto('/auth');
    expect(await theme(page)).toBe('misfit');
    await ctx.close();
  });

  test('it follows the device as the device changes, until a theme is chosen', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'light' });
    const page = await ctx.newPage();
    await page.goto('/auth');
    expect(await theme(page)).toBe('paper');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(() => theme(page)).toBe('misfit');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect.poll(() => theme(page)).toBe('paper');
    await ctx.close();
  });

  test('a saved choice wins over the device, light or dark', async ({ browser }) => {
    for (const [scheme, saved] of [['light', 'misfit'], ['dark', 'paper']] as const) {
      const ctx = await browser.newContext({ colorScheme: scheme });
      await ctx.addInitScript((id) => { try { localStorage.setItem('mc_theme', JSON.stringify({ id })); } catch { /* private mode */ } }, saved);
      const page = await ctx.newPage();
      await page.goto('/auth');
      expect(await theme(page), `${scheme} device, ${saved} saved`).toBe(saved);
      // and it stays through a change of the device
      await page.emulateMedia({ colorScheme: scheme === 'light' ? 'dark' : 'light' });
      await page.waitForTimeout(300);
      expect(await theme(page), `${scheme} device changed, ${saved} saved`).toBe(saved);
      await ctx.close();
    }
  });

  test('Paper on a light device reads: the page is light, not a dark page with a light attribute', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'light' });
    const page = await ctx.newPage();
    await page.goto('/auth');
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const [r, g, b] = (bg.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    expect((r + g + b) / 3, `body background ${bg}`).toBeGreaterThan(200);
    await ctx.close();
  });
});
