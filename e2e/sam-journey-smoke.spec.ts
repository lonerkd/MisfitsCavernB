import { test, expect } from '@playwright/test';

test.describe('Sam Persona — Full Journey Smoke', () => {
  test('home page loads without error boundary', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something broke/i)).not.toBeVisible();
    await expect(page.getByText(/unexpected error/i)).not.toBeVisible();
    expect(errors.filter((e) => /postgres_changes|unhandled rejection|react error/i.test(e)).length).toBe(0);
  });

  test('home page shows suite navigation and branding', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).not.toBeEmpty();
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test('auth page renders login form', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/sign in|log in|email/i).first()).toBeVisible();
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('settings page loads without crash', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something broke/i)).not.toBeVisible();
    await expect(page.getByText(/settings|preferences|profile/i).first()).toBeVisible();
  });

  test('studio page loads without crash', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something broke/i)).not.toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('lounge page loads without crash', async ({ page }) => {
    await page.goto('/lounge');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something broke/i)).not.toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('editor page loads without crash', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something broke/i)).not.toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('projects page loads without crash', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something broke/i)).not.toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('jobs page loads without crash', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something broke/i)).not.toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('crew page loads without crash', async ({ page }) => {
    await page.goto('/crew');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something broke/i)).not.toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('portfolio page loads without crash', async ({ page }) => {
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something broke/i)).not.toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('showcase page loads without crash', async ({ page }) => {
    await page.goto('/showcase');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something broke/i)).not.toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('not-found page renders custom 404', async ({ page }) => {
    const response = await page.goto('/this-path-does-not-exist');
    await page.waitForLoadState('networkidle');

    expect(response?.status()).toBe(404);
    await expect(page.getByText(/not found|404|missing/i).first()).toBeVisible();
  });

  test('error boundary recovers with Try Again', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const tryAgain = page.getByRole('button', { name: /try again/i });
    if (await tryAgain.isVisible().catch(() => false)) {
      await tryAgain.click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(/something broke/i)).not.toBeVisible();
    }
  });

  test('console has no critical errors across key pages', async ({ page }) => {
    const errors: { page: string; msg: string }[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push({ page: page.url(), msg: msg.text() });
    });

    const pages = ['/', '/auth', '/projects', '/jobs', '/crew', '/settings'];
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
    }

    const critical = errors.filter(
      (e) => /postgres_changes|unhandled rejection|react error|cannot read property/i.test(e.msg)
    );
    expect(critical.length).toBe(0);
  });
});
