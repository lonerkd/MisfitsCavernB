import { test, expect, type Page } from '@playwright/test';

// Password recovery end to end, on the local stack: the reset email lands in
// the local mail catcher (Mailpit, behind Supabase's `inbucket` port 54324).
// Skipped when that catcher isn't reachable (a run against a deployed URL).
const MAIL = process.env.MAIL_CATCHER_URL || 'http://127.0.0.1:54324';
const OLD_PASSWORD = 'Cavern-Recover-Old-2026!';
const NEW_PASSWORD = 'Violet-Lantern-Reset-92!';

async function mailCatcherUp(): Promise<boolean> {
  try {
    const res = await fetch(`${MAIL}/api/v1/messages?limit=1`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** The newest message to `email` whose text carries a link, polled until it arrives. */
async function resetLinkFor(email: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const search = await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    const { messages } = (await search.json()) as { messages?: { ID: string }[] };
    if (messages?.length) {
      const full = await fetch(`${MAIL}/api/v1/message/${messages[0].ID}`);
      const { Text, HTML } = (await full.json()) as { Text?: string; HTML?: string };
      const match = `${Text ?? ''}\n${HTML ?? ''}`.match(/https?:\/\/[^\s"'<>]+\/auth\/v1\/verify[^\s"'<>]+/);
      if (match) return match[0].replace(/&amp;/g, '&');
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No reset email reached ${email}`);
}

async function requestReset(page: Page, email: string) {
  await page.goto('/auth');
  await expect(page.getByRole('button', { name: /^sign in$/i }).last()).toBeEnabled();
  await page.getByRole('button', { name: /forgot password/i }).click();
  await page.locator('input[name="email"]').fill(email);
  await page.getByRole('button', { name: /send reset link/i }).click();
}

const SAME_ANSWER = /if that address has an account/i;

test.describe('password recovery', () => {
  test.beforeAll(async () => {
    test.skip(!(await mailCatcherUp()), 'needs the local mail catcher (supabase start)');
  });

  test('forgot password → email → new password → signs in with it', async ({ browser }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const email = `e2e.recover.${Date.now()}.${Math.floor(Math.random() * 1e4)}@example.com`;

    // 1 — an account exists (made in its own browser, then left behind).
    const maker = await browser.newContext({ baseURL });
    const makerPage = await maker.newPage();
    await makerPage.goto('/auth');
    await makerPage.getByRole('button', { name: 'Sign Up' }).first().click();
    await makerPage.fill('input[name="email"]', email);
    await makerPage.fill('input[name="username"]', `recover${String(Date.now()).slice(-7)}`);
    await makerPage.fill('input[name="password"]', OLD_PASSWORD);
    await makerPage.getByRole('button', { name: 'Create Account' }).click();
    await makerPage.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 25_000 });
    await maker.close();

    // 2 — a signed-out browser asks for a reset.
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await requestReset(page, email);
    await expect(page.getByRole('status').filter({ hasText: SAME_ANSWER })).toBeVisible();

    // 3 — the link in the email opens the reset page.
    const link = await resetLinkFor(email);
    await page.goto(link);
    await expect(page).toHaveURL(/\/auth\/reset/);
    await expect(page.getByRole('button', { name: /set new password/i })).toBeEnabled({ timeout: 15_000 });

    // 4 — weak, then mismatched, then good.
    await page.locator('input[name="password"]').fill('password123');
    await page.locator('input[name="confirm"]').fill('password123');
    await page.getByRole('button', { name: /set new password/i }).click();
    await expect(page.getByRole('alert')).toContainText(/most-common/i);

    await page.locator('input[name="password"]').fill(NEW_PASSWORD);
    await page.locator('input[name="confirm"]').fill(`${NEW_PASSWORD}x`);
    await page.getByRole('button', { name: /set new password/i }).click();
    await expect(page.getByRole('alert')).toContainText(/match/i);

    await page.locator('input[name="confirm"]').fill(NEW_PASSWORD);
    await page.getByRole('button', { name: /set new password/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 25_000 });
    await context.close();

    // 5 — a fresh browser signs in with the new password, and the old one is dead.
    const fresh = await browser.newContext({ baseURL });
    const freshPage = await fresh.newPage();
    await freshPage.goto('/auth');
    await expect(freshPage.getByRole('button', { name: /^sign in$/i }).last()).toBeEnabled();
    await freshPage.fill('input[name="email"]', email);
    await freshPage.fill('input[name="password"]', OLD_PASSWORD);
    await freshPage.getByRole('button', { name: /^sign in$/i }).last().click();
    await expect(freshPage.getByText('Incorrect email or password.')).toBeVisible();

    await freshPage.fill('input[name="password"]', NEW_PASSWORD);
    await freshPage.getByRole('button', { name: /^sign in$/i }).last().click();
    await freshPage.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 25_000 });
    await fresh.close();
  });

  test('an address with no account gets the same answer', async ({ page }) => {
    await requestReset(page, `nobody.${Date.now()}@example.com`);
    await expect(page.getByRole('status').filter({ hasText: SAME_ANSWER })).toBeVisible();
  });

  test('a bad email is caught before anything is sent', async ({ page }) => {
    await requestReset(page, 'sam@localhost');
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('an expired or foreign link says so and offers a new one', async ({ page }) => {
    await page.goto('/auth/reset?error=access_denied&error_code=otp_expired');
    await expect(page.getByRole('alert')).toContainText(/expired/i);
    await page.getByRole('link', { name: /send me a new link/i }).click();
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible();
  });
});
