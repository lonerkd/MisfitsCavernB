import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, chromium } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The editor puts the caret back after it reshapes the text itself (an opening parenthesis becomes a pair, a
// Tab cycles the line). The next key must land at the caret, not at the end of the script, even when it is
// pressed at once. Real data, no mocks. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const BASE = 'INT. KITCHEN - NIGHT\n\nMAYA\nStill up.\n\nEXT. PIER - DAY\n\nBoats come in.\n';

test.describe('Caret after the editor reshapes the text (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId = '';
  let projectId = '';
  let scriptId = '';
  const email = `caret.${TAG}@journey.test`;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    userId = (await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `caret${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Caret ${TAG}`, creator_id: userId }).select('id').single()).data!.id;
    scriptId = (await admin.from('scripts').insert({ title: 'Kitchen', content: BASE, project_id: projectId, created_by: userId, last_edited_by: userId }).select('id').single()).data!.id;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  test('typing straight after "(" lands inside the pair, wherever the caret was', async () => {
    test.setTimeout(120_000);
    const browser = await chromium.launch({ executablePath: process.env.MC_LOCAL_CHROMIUM });
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    const page = await ctx.newPage();
    try {
      await page.goto('/auth');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', PASSWORD);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
      await page.goto('/studio');
      const picker = page.getByLabel('Active project');
      await picker.waitFor();
      if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
      await page.goto(`/editor?script=${scriptId}`);
      const script = page.getByLabel('Script', { exact: true });
      await expect(script).toHaveValue(BASE, { timeout: 30_000 });

      for (let round = 1; round <= 12; round++) {
        // The caret goes just before "Still up." each time, wherever the last round left things.
        await script.evaluate((el) => { const t = el as HTMLTextAreaElement; const n = t.value.indexOf('Still up.'); t.focus(); t.setSelectionRange(n, n); });
        // No delay between keys: the next key is already on its way when the editor reshapes the text.
        await page.keyboard.type('(abc', { delay: 0 });
        const v = await script.inputValue();
        expect(v.endsWith('Boats come in.\n'), `a key landed at the end of the script: ${JSON.stringify(v.slice(-12))}`).toBe(true);
        expect(v.split('(abc').length - 1, v).toBe(round);
      }
    } finally { await ctx.close(); await browser.close(); }
  });
});
