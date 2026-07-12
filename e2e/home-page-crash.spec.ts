import { test, expect } from '@playwright/test';

test.describe('Home Page Crash', () => {
    test('root page loads without hitting the error boundary', async ({ page }) => {
          await page.goto('/');

             await expect(page.getByText(/something broke/i)).not.toBeVisible();
          await expect(page.getByText(/unexpected error/i)).not.toBeVisible();
    });

                test('console has no postgres_changes subscription error on notifications channel', async ({ page }) => {
                      const consoleErrors: string[] = [];
                      page.on('console', (msg) => {
                              if (msg.type() === 'error') consoleErrors.push(msg.text());
                      });

                         await page.goto('/');
                      await page.waitForTimeout(2000);

                         const hasRealtimeError = consoleErrors.some((err) =>
                                 /postgres_changes/i.test(err) && /notif/i.test(err)
                                                                         );
                      expect(hasRealtimeError).toBeFalsy();
                });

                test('Try Again button recovers the page if error boundary is shown', async ({ page }) => {
                      await page.goto('/');

                         const tryAgainButton = page.getByRole('button', { name: /try again/i });
                      if (await tryAgainButton.isVisible().catch(() => false)) {
                              await tryAgainButton.click();
                              await expect(page.getByText(/something broke/i)).not.toBeVisible();
                      }
                });
});
