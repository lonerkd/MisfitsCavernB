import { Page, expect } from '@playwright/test';

export async function loginUser(page: Page, email: string, password: string) {
    await page.goto('/');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
}

export async function toggleStudioModule(page: Page, enabled: boolean) {
  await page.goto('/settings');
  const toggle = page.locator('[data-testid="studio-toggle"]');
  const isChecked = await toggle.isChecked();
  if (isChecked !== enabled) {
    await toggle.click();
    await page.waitForTimeout(500);
}
}

export async function checkForPostgresErrors(page: Page): Promise<boolean> {
  const errors = await page.evaluate(() => {
    const errorMessages = [];
    const allText = document.body.innerText;
    if (allText.includes('postgres_changes')) {
      errorMessages.push('postgres_changes error detected');
}
    return errorMessages;
});
  return errors.length > 0;
}

export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}
