import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Browser } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Story beat → script, two sessions: the owner is writing (with an edit not
// yet saved) while a crew member adds a beat to the script from the Studio's
// beat board. The beat lands at the end of the open script, the owner's
// typing is kept, and the saved script has both. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Beat → script (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const owner = { id: '', email: `bt-owner.${TAG}@journey.test` };
  const crew = { id: '', email: `bt-crew.${TAG}@journey.test` };
  let projectId = '';
  let scriptId = '';
  let beatId = '';

  const signIn = async (browser: Browser, who: { email: string }) => {
    const page = await (await browser.newContext()).newPage();
    await page.goto('/auth');
    await page.fill('input[name="email"]', who.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    return page;
  };

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const [who, name] of [[owner, `btowner${TAG}`], [crew, `btcrew${TAG}`]] as const) {
      who.id = (await admin.auth.admin.createUser({ email: who.email, password: PASSWORD, email_confirm: true, user_metadata: { username: name } })).data.user!.id;
    }
    projectId = (await admin.from('projects').insert({ title: `Lantern ${TAG}`, creator_id: owner.id, status: 'pre-production' }).select('id').single()).data!.id;
    await admin.from('project_crew').insert({ project_id: projectId, user_id: crew.id, craft: 'Writer', status: 'confirmed' });
    scriptId = (await admin.from('scripts').insert({ title: `Lantern ${TAG}`, content: 'INT. LIGHTHOUSE - NIGHT\n\nWind against the glass.\n', project_id: projectId, created_by: owner.id, last_edited_by: owner.id }).select('id').single()).data!.id;
    beatId = (await admin.from('project_beats').insert({ project_id: projectId, title: 'The match goes out', content: 'Ana loses the light and hears the boat.', created_by: crew.id, order_index: 0 }).select('id').single()).data!.id;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
    for (const who of [owner, crew]) if (who.id) await admin.auth.admin.deleteUser(who.id);
  });

  test('a beat lands in the open script; the writer’s unsaved typing is kept', async ({ browser }) => {
    test.setTimeout(150_000);

    // The owner is writing.
    const sam = await signIn(browser, owner);
    await sam.goto(`/editor?script=${scriptId}`);
    const ta = sam.getByLabel('Script', { exact: true });
    await expect(ta).toHaveValue(/LIGHTHOUSE/, { timeout: 20_000 });
    await sam.waitForTimeout(2500); // the live channel is joined
    // Hold the owner's saves, so what they type next is still unsaved when the beat arrives.
    const held: Array<() => Promise<void>> = [];
    await sam.route((u) => u.pathname.endsWith('/rest/v1/scripts'), async (route) => {
      if (route.request().method() !== 'PATCH') return route.continue();
      held.push(() => route.continue());
    });
    await ta.click();
    await sam.keyboard.press('Control+End');
    await sam.keyboard.type('Ana waits by the lamp.');

    // A crew member adds the beat to the script from the beat board.
    const jo = await signIn(browser, crew);
    await jo.goto('/studio');
    const picker = jo.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    await jo.goto('/studio?tab=production&view=story');
    await jo.getByRole('button', { name: 'Add to script' }).click();
    await expect(jo.getByRole('link', { name: /In the script/ })).toBeVisible({ timeout: 20_000 });
    expect((await admin.from('project_beats').select('script_id').eq('id', beatId).single()).data?.script_id).toBe(scriptId);

    // In the owner's editor: their typing, then the beat.
    await expect(ta).toHaveValue(/Ana waits by the lamp\.[\s\S]*# The match goes out\n= Ana loses the light and hears the boat\./, { timeout: 15_000 });

    // Let the owner's saves through: the script ends with both, once each.
    await sam.unrouteAll();
    for (const go of held) await go().catch(() => {});
    await sam.keyboard.type(' ');
    await expect.poll(async () => (await admin.from('scripts').select('content').eq('id', scriptId).single()).data?.content ?? '', { timeout: 20_000 })
      .toMatch(/Ana waits by the lamp\.[\s\S]*# The match goes out\n= Ana loses the light and hears the boat\./);
    const saved = (await admin.from('scripts').select('content').eq('id', scriptId).single()).data!.content as string;
    expect(saved.split('# The match goes out').length - 1).toBe(1);
    expect(saved.split('Ana waits by the lamp.').length - 1).toBe(1);
  });

  test('only people who can open the project can add to its script', async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    const outsiderEmail = `bt-out.${TAG}@journey.test`;
    const outsiderId = (await admin.auth.admin.createUser({ email: outsiderEmail, password: PASSWORD, email_confirm: true, user_metadata: { username: `btout${TAG}` } })).data.user!.id;
    try {
      const riley = createClient(s.API_URL, s.ANON_KEY, { auth: { persistSession: false } });
      await riley.auth.signInWithPassword({ email: outsiderEmail, password: PASSWORD });
      const before = (await admin.from('scripts').select('content').eq('id', scriptId).single()).data!.content;
      const { error } = await riley.rpc('append_to_script', { p_script: scriptId, p_text: '\nRILEY WAS HERE' });
      expect(error?.message).toMatch(/not found/i);
      expect((await admin.from('scripts').select('content').eq('id', scriptId).single()).data!.content).toBe(before);
      const anon = createClient(s.API_URL, s.ANON_KEY, { auth: { persistSession: false } });
      expect((await anon.rpc('append_to_script', { p_script: scriptId, p_text: '\nANON' })).error).not.toBeNull();
    } finally {
      await admin.auth.admin.deleteUser(outsiderId);
    }
  });
});
