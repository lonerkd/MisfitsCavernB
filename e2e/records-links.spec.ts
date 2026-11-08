import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Browser, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The role tools link to the film graph (2026-11-08): a crew member links a camera report to a real scene, the scene is
// renumbered, and the record shows the new number (the link, not the typed text, is the truth). Costumes link a character,
// and a scene that is not written yet stays a label. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Records linked to the film graph (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const owner = { id: '', email: `rl-owner.${TAG}@journey.test`, name: `rlowner${TAG}` };
  const crew = { id: '', email: `rl-crew.${TAG}@journey.test`, name: `rlcrew${TAG}` };
  let projectId: string;
  let sceneId: string;

  const signIn = async (browser: Browser, who: typeof owner) => {
    const page = await (await browser.newContext()).newPage();
    await page.goto('/auth');
    await page.fill('input[name="email"]', who.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    return page;
  };

  const openTool = async (page: Page, tool: string) => {
    await page.goto('/studio?tab=production');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    await page.getByText(tool, { exact: true }).first().click();
  };

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const who of [owner, crew]) {
      const { data } = await admin.auth.admin.createUser({ email: who.email, password: PASSWORD, email_confirm: true, user_metadata: { username: who.name } });
      who.id = data.user!.id;
    }
    projectId = (await admin.from('projects').insert({ title: `Links ${TAG}`, creator_id: owner.id, status: 'pre-production' }).select('id').single()).data!.id;
    const crewRow = await admin.from('project_crew').insert({ project_id: projectId, user_id: crew.id, craft: 'Camera operator', role: 'contributor', status: 'confirmed' });
    if (crewRow.error) throw crewRow.error;
    const script = await admin.from('scripts').insert({ title: 'Pier', content: 'INT. KITCHEN - DAY\n\nMAYA\nHi.\n', project_id: projectId, created_by: owner.id, last_edited_by: owner.id }).select('id').single();
    if (script.error) throw script.error;
    const scene = await admin.from('scenes').insert({ project_id: projectId, script_id: script.data.id, scene_number: 1, heading: 'INT. KITCHEN - DAY', title: 'KITCHEN', ordinal: 0 }).select('id').single();
    if (scene.error) throw scene.error;
    sceneId = scene.data.id;
    const character = await admin.from('characters').insert({ project_id: projectId, name: 'MAYA' });
    if (character.error) throw character.error;
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    for (const who of [owner, crew]) await admin.auth.admin.deleteUser(who.id);
  });

  test('crew link a camera report to a scene; renumbering the scene shows in the record', async ({ browser }) => {
    const page = await signIn(browser, crew);
    await openTool(page, 'Camera report');
    await page.getByLabel('Scene: add a scene').selectOption(sceneId);
    await page.getByLabel('Shot').fill('A1');
    // The island's pill floats over the bottom of the form: click without a pointer, as a keyboard press would.
    await page.getByRole('button', { name: /^(add|log|schedule)/i }).dispatchEvent('click');
    await expect(page.getByText('Sc 1', { exact: true })).toBeVisible();

    const stored = await admin.from('production_records').select('scene_ids, data').eq('project_id', projectId).eq('kind', 'cameraReports').single();
    expect(stored.data?.scene_ids).toEqual([sceneId]);
    expect(stored.data?.data).toMatchObject({ scene: '1' });

    // A scene is added before it in the script: the Studio's sync renumbers the kitchen to 2, and the record follows the link,
    // not the typed "1".
    await admin.from('scripts').update({ content: 'INT. HALL - DAY\n\nSomeone waits.\n\nINT. KITCHEN - DAY\n\nMAYA\nHi.\n' }).eq('project_id', projectId);
    await page.reload();
    await page.getByLabel('Active project').waitFor();
    await page.getByText('Camera report', { exact: true }).first().click();
    await expect(page.getByText('Sc 2', { exact: true })).toBeVisible();
    const still = await admin.from('production_records').select('scene_ids').eq('project_id', projectId).eq('kind', 'cameraReports').single();
    expect(still.data?.scene_ids).toEqual([sceneId]);
  });

  test('a scene not written yet stays a label with no link, and Costumes link a real character', async ({ browser }) => {
    const page = await signIn(browser, crew);
    await openTool(page, 'Costumes');
    await page.getByLabel('Scene: add a scene').selectOption('__other__');
    await page.getByLabel('Scene (typed)').fill('40 (reshoot)');
    await page.getByRole('combobox', { name: 'Character' }).selectOption({ label: 'MAYA' });
    await page.getByRole('button', { name: /^(add|log|schedule)/i }).dispatchEvent('click');
    await expect(page.getByText('Sc 40 (reshoot)')).toBeVisible();
    const stored = await admin.from('production_records').select('scene_ids, character_id').eq('project_id', projectId).eq('kind', 'costumes').single();
    expect(stored.data?.scene_ids).toEqual([]);
    expect(stored.data?.character_id).not.toBeNull();
  });
});
