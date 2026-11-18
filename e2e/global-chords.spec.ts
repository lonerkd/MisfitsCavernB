import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';

// The suite's global chords (lib/os/chords.ts) mean the same thing in every tool: Ctrl K opens search and Ctrl / the
// shortcuts panel, on the Today page and inside the editor's text box alike. Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe.serial('Global chords (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  const user = { id: '', email: `gc.${TAG}@journey.test` };

  test.beforeAll(async ({ stack }) => {
    user.id = (await stack.createUser({ email: user.email, password: PASSWORD, username: `gc${TAG}` })).id;
  });

  test('Ctrl K opens search and Ctrl / the shortcuts, on Today and in the editor', async ({ page }) => {
    test.setTimeout(120_000);
    await signInAs(page, { email: user.email, password: PASSWORD });

    for (const route of ['/community', '/editor']) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      // Inside the editor, the press happens with the script's text box focused (a failure to find it fails the test).
      if (route === '/editor') {
        const script = page.getByRole('textbox', { name: 'Script', exact: true });
        await script.click({ timeout: 30_000 });
        await expect(script).toBeFocused();
      } else await page.locator('body').click();

      await page.keyboard.press('Control+k');
      await expect(page.getByRole('dialog', { name: 'Search the suite' })).toBeVisible({ timeout: 15_000 });
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog', { name: 'Search the suite' })).toHaveCount(0);

      await page.keyboard.press('Control+/');
      await expect(page.getByRole('heading', { name: 'KEYBOARD SHORTCUTS' })).toBeVisible({ timeout: 15_000 });
      // The panel lists the global chords from the same table the handlers read.
      await expect(page.getByText('Search everything: the command palette')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('heading', { name: 'KEYBOARD SHORTCUTS' })).toHaveCount(0);
    }
  });

  test('inside a split pane the search and shortcuts open on the split page', async ({ page }) => {
    test.setTimeout(120_000);
    await signInAs(page, { email: user.email, password: PASSWORD });

    await page.goto('/community');
    await page.keyboard.press('Control+\\');
    await page.waitForURL(/\/split/, { timeout: 30_000 });
    const pane = page.frameLocator('iframe').first();
    await pane.locator('body').click({ timeout: 30_000 });
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog', { name: 'Search the suite' })).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+/');
    await expect(page.getByRole('heading', { name: 'KEYBOARD SHORTCUTS' })).toBeVisible({ timeout: 15_000 });
  });
});
