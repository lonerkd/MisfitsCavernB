import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';

// "Connect Spotify" on a site Spotify can't send anyone back to (a local or
// preview address) must say why, here — not fail silently, and not walk the
// person to Spotify's own red "Invalid redirect URI" page. The redirect rules
// themselves are unit-tested (lib/spotify/redirect.test.ts). Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Spotify connect (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  const me = { id: '', email: `sp.${TAG}@journey.test` };

  test.beforeAll(async ({ stack }) => {
    me.id = (await stack.createUser({ email: me.email, password: PASSWORD, username: `sp${TAG}` })).id;
  });

  test('says why it can’t connect, and stays on the site', async ({ page }) => {
    test.setTimeout(90_000);
    await signInAs(page, { email: me.email, password: PASSWORD });

    await page.goto('/soundtrack');
    await page.getByRole('button', { name: /Connect Spotify/ }).first().click();

    // Either Spotify isn't configured in this build, or this address isn't one Spotify accepts:
    // both say so in a message here.
    await expect(page.getByText(/isn’t set up for this site|Spotify no longer accepts|Spotify can only send you back/)).toBeVisible({ timeout: 10_000 });
    expect(new URL(page.url()).hostname).not.toContain('spotify.com');
  });
});
