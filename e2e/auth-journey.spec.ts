import { test, expect } from '@playwright/test';

// Live auth journey. This spec is OPT-IN (E2E_LIVE_AUTH=1) because it creates a
// real account against whatever baseURL it runs against. It is deliberately not
// part of the default CI job (which runs only the unauthenticated specs).
//
// Run it against production with:
//   $env:E2E_LIVE_AUTH=1; $env:PLAYWRIGHT_BASE_URL='https://misfits-cavern-b.vercel.app'; npx playwright test e2e/auth-journey.spec.ts
const LIVE = process.env.E2E_LIVE_AUTH === '1';
const PASSWORD = 'Cavern-Journey-2026!';

function uniqueEmail() {
  return `e2e.journey.${Date.now()}.${Math.floor(Math.random() * 1e4)}@example.com`;
}

function uniqueUsername() {
  return `journey${String(Date.now()).slice(-7)}`;
}

/** Records every top-level navigation so a bounce/loop is visible in the log. */
function trackNavigations(page: import('@playwright/test').Page) {
  const trace: string[] = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      try {
        const u = new URL(frame.url());
        trace.push(u.pathname + u.search);
      } catch {
        trace.push(frame.url());
      }
    }
  });
  return trace;
}

async function signUp(page: import('@playwright/test').Page, email: string, username: string) {
  await page.goto('/auth');
  await page.getByRole('button', { name: 'Sign Up' }).first().click();
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', PASSWORD);
  await page.getByRole('button', { name: 'Create Account' }).click();
}

test.describe('auth journey (live backend)', () => {
  test.skip(!LIVE, 'set E2E_LIVE_AUTH=1 to run against a real backend');

  test('signup lands in the app and stays there (no bounce back to /auth)', async ({ page }) => {
    const email = uniqueEmail();
    const trace = trackNavigations(page);

    await signUp(page, email, uniqueUsername());

    // Wait for the app to leave /auth.
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 25_000 }).catch(() => {});

    // Then watch: a redirect-loop shows up as a return to /auth shortly after.
    await page.waitForTimeout(7_000);

    console.log('NAV TRACE:', JSON.stringify(trace, null, 1));
    console.log('FINAL URL:', page.url());
    console.log('BODY SNIPPET:', (await page.locator('body').innerText()).slice(0, 300).replace(/\s+/g, ' '));

    expect(trace.filter((p) => p.startsWith('/auth')).length, 'should have visited /auth at least once').toBeGreaterThan(0);
    expect(new URL(page.url()).pathname).toBe('/projects');

    // The real loop test: once we have landed in the app, we must not be sent
    // back to /auth at any point afterwards.
    const firstProjects = trace.indexOf('/projects');
    const afterLanding = firstProjects >= 0 ? trace.slice(firstProjects + 1) : trace;
    expect(afterLanding.filter((p) => p.startsWith('/auth')), 'bounced back to /auth after landing').toHaveLength(0);
  });

  test('every authed surface opens for a brand-new account', async ({ page }) => {
    const email = uniqueEmail();
    await signUp(page, email, uniqueUsername());
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 25_000 }).catch(() => {});
    await page.waitForTimeout(3_000);

    const surfaces = ['/projects', '/studio', '/editor', '/lounge', '/soundtrack', '/portfolio', '/crew', '/jobs', '/settings', '/profile'];
    const results: Record<string, string> = {};

    for (const path of surfaces) {
      await page.goto(path);
      await page.waitForTimeout(2_500);
      const landed = new URL(page.url()).pathname;
      const body = (await page.locator('body').innerText()).slice(0, 200).replace(/\s+/g, ' ');
      results[path] = landed === path ? `OK (${body.slice(0, 60)})` : `BOUNCED -> ${landed}`;
    }

    console.log('SURFACE RESULTS:', JSON.stringify(results, null, 1));
    const bounced = Object.entries(results).filter(([, v]) => v.startsWith('BOUNCED'));
    expect(bounced, `these surfaces bounced a signed-in user: ${JSON.stringify(bounced)}`).toHaveLength(0);
  });

  test('signin honours the ?redirect= the middleware set', async ({ page }) => {
    const email = uniqueEmail();
    await signUp(page, email, uniqueUsername());
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 25_000 }).catch(() => {});

    // Sign out so the next request is anonymous (the way a real user arrives).
    await page.context().clearCookies();

    // Hitting a protected route while logged out must send us to /auth?redirect=...
    await page.goto('/studio');
    await page.waitForTimeout(2_500);
    const afterGate = new URL(page.url());
    console.log('GATE URL:', afterGate.pathname + afterGate.search);
    expect(afterGate.pathname).toBe('/auth');
    expect(afterGate.searchParams.get('redirect')).toBe('/studio');

    // Signing back in should return us to /studio, not dump us on /projects.
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('form').getByRole('button', { name: 'Sign In' }).click();
    await page.waitForTimeout(8_000);

    console.log('AFTER SIGN-IN URL:', page.url());
    expect(new URL(page.url()).pathname, 'redirect target was not honoured').toBe('/studio');
  });
});