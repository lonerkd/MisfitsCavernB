import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, chromium } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// A podcast script and a documentary outline are read with their own rules (BACKLOG 3.35): opening one in the
// Studio writes the scene index from the segments, not from screenplay headings. Real browser, real local stack.
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const PODCAST = 'COLD OPEN\n\nHOST: Welcome back to the show.\nGUEST: Glad to be here.\n\nSEGMENT ONE\n\nHOST: Tell me how you started.\nGUEST: By accident, honestly.\n';
const OUTLINE = '00:00 - Opening on the harbour at dawn\nGulls over grey water.\n\nINTERVIEW: Marta Ruiz\nMarta: "The sea gave and the sea took."\n\nB-ROLL: nets drying on the pier\n';

test.describe('Podcast and outline scripts keep their own scene index (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId = '';
  let projectId = '';
  const email = `fmt.${TAG}@journey.test`;
  const scripts: Record<string, string> = {};

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    userId = (await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `fmt${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Formats ${TAG}`, creator_id: userId, status: 'production' }).select('id').single()).data!.id;
    for (const [format, content] of [['podcast', PODCAST], ['doc-outline', OUTLINE]] as const) {
      const { data, error } = await admin.from('scripts').insert({ title: `Pod ${format}`, content, format, project_id: projectId, created_by: userId, last_edited_by: userId }).select('id').single();
      if (error) throw new Error(error.message);
      scripts[format] = data.id;
    }
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  test('opening each script in the Studio writes scenes from its segments', async () => {
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
      const sceneCount = async (id: string) => (await admin.from('scenes').select('id', { count: 'exact', head: true }).eq('script_id', id)).count ?? 0;

      for (const [format, want] of [['podcast', 2], ['doc-outline', 3]] as const) {
        // The Studio opens the script this device chose last (a per-device preference): choose it, then open the Studio.
        await page.goto('/community');
        await page.evaluate(([key, id]) => localStorage.setItem(key, id), [`mc_studio_script_${projectId}`, scripts[format]]);
        await page.goto(`/studio?project=${projectId}`);
        await expect.poll(() => sceneCount(scripts[format]), { timeout: 30_000, message: `${format} scene index` }).toBe(want);
      }
    } finally { await ctx.close(); await browser.close(); }
  });
});
