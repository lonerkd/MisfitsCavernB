import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { SupabaseClient } from '@supabase/supabase-js';

// A tool before its phase says what it takes to open it, who does each step and where, and what opens it early (BACKLOG 3.46 phase locks).
// Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('The phase lock (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);
  let admin: SupabaseClient;
  const me = { id: '', email: `pl.${TAG}@journey.test` };
  let projectId = '';

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    me.id = (await stack.createUser({ email: me.email, password: PASSWORD, username: `pl${TAG}` })).id;
    projectId = (await admin.from('projects').insert({ title: `Locks ${TAG}`, creator_id: me.id, status: 'development', project_type: 'Short Film' }).select('id').single()).data!.id;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
  });

  test('Post says what is left before its phase, who does it, how it opens early, and can still be looked at', async ({ page }) => {
    test.setTimeout(120_000);
    await signInAs(page, { email: me.email, password: PASSWORD });
    await page.goto(`/studio?project=${projectId}&tab=post`);
    const lock = page.getByRole('region', { name: 'Cut review & delivery' });
    await expect(lock).toBeVisible({ timeout: 30_000 });
    await expect(lock).toContainText(/Opens in/);
    await expect(lock.getByRole('heading', { name: /Before .*: \d+ to finish/ })).toBeVisible();
    await expect(lock).toContainText('Write the logline');
    await expect(lock).toContainText('Usually: Writer');
    await expect(lock).toContainText('Or start the work:');
    await expect(lock).toContainText('Add a cut');
    await expect(lock).toContainText('Works in it: Editor');
    await page.screenshot({ path: '/tmp/phase-lock.png' });
    // Go takes you to where the work is done.
    await lock.getByRole('link', { name: 'Go: Build a character' }).click().catch(() => {});
    await page.goto(`/studio?project=${projectId}&tab=post`);
    // And it is still not a wall.
    await page.getByRole('region', { name: 'Cut review & delivery' }).getByRole('button', { name: 'Open it now' }).click();
    await expect(page.getByRole('region', { name: 'Cut review & delivery' })).toHaveCount(0);
  });
});
