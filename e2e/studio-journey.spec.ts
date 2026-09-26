import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Page, type Browser } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The Studio, end to end, in a real browser against a real local Supabase
// (the stack the CI `database` job starts). Nothing is mocked:
//   upload in the Studio → link to a scene → see it in the editor → publish
//   → open the share link logged out → crew sees library changes live.
// Opt-in: E2E_LOCAL_STACK=1, with the app built against the local stack.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const SCRIPT = 'INT. CAVE - NIGHT\n\nSam lights a match. The flame shakes.\n\nSAM\nHello?\n\nEXT. ROAD - DAY\n\nA truck passes.\n';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

type Stack = { url: string; anon: string; service: string };
function stack(): Stack {
  const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  return { url: s.API_URL, anon: s.ANON_KEY, service: s.SERVICE_ROLE_KEY };
}

async function makeUser(admin: SupabaseClient, label: string) {
  const email = `${label}.${Date.now()}.${Math.floor(Math.random() * 1e4)}@journey.test`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `${label}${Date.now().toString(36)}` } });
  if (error || !data.user) throw error ?? new Error('createUser failed');
  return { id: data.user.id, email };
}

async function signIn(page: Page, email: string) {
  await page.goto('/auth');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
}

async function openStudio(page: Page, projectId: string, tab: string) {
  await page.goto(`/studio?tab=${tab}`);
  const picker = page.getByLabel('Active project');
  await expect(picker).toBeVisible();
  if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
}

test.describe('Studio journey (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');
  test.describe.configure({ mode: 'serial' });

  let s: Stack;
  let admin: SupabaseClient;
  let sam: { id: string; email: string };
  let jordan: { id: string; email: string };
  let projectId: string;
  let scriptId: string;

  test.beforeAll(async () => {
    s = stack();
    admin = createClient(s.url, s.service, { auth: { persistSession: false } });
    sam = await makeUser(admin, 'sam');
    jordan = await makeUser(admin, 'jordan');
    const project = await admin.from('projects').insert({ title: 'The Cave', creator_id: sam.id, description: 'A flame in the dark.' }).select('id').single();
    projectId = project.data!.id;
    await admin.from('project_crew').insert({ project_id: projectId, user_id: jordan.id, role: 'Production Designer', status: 'confirmed' });
    const script = await admin.from('scripts').insert({ title: 'The Cave', content: SCRIPT, project_id: projectId, created_by: sam.id, last_edited_by: sam.id }).select('id').single();
    scriptId = script.data!.id;
  });

  test.afterAll(async () => {
    if (!admin) return;
    const { data: files } = await admin.from('media').select('storage_path').eq('project_id', projectId);
    const paths = (files ?? []).map((f) => f.storage_path).filter(Boolean) as string[];
    if (paths.length) await admin.storage.from('project-media').remove(paths);
    await admin.from('scripts').delete().eq('project_id', projectId);
    for (const u of [sam, jordan]) if (u) await admin.auth.admin.deleteUser(u.id);
  });

  test('upload → link to a scene → editor → publish → share link → live crew sync', async ({ browser, page }) => {
    await signIn(page, sam.email);

    // 1. Upload a still into the project library.
    await openStudio(page, projectId, 'library');
    await page.locator('input[type="file"]').first().setInputFiles({ name: 'firelight.png', mimeType: 'image/png', buffer: PNG });
    const card = page.getByRole('button', { name: 'firelight — Image' });
    await expect(card).toBeVisible();
    const { data: uploaded } = await admin.from('media').select('id, storage_path, created_by').eq('project_id', projectId).single();
    expect(uploaded).toMatchObject({ created_by: sam.id });
    expect(uploaded!.storage_path).toMatch(new RegExp(`^${projectId}/${uploaded!.id}/firelight\\.png$`));

    // 2. The Scenes tab has read the screenplay; link the still to scene 1.
    await page.getByRole('tab', { name: 'Scenes' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'In step with the script · 2 scenes' })).toBeVisible();
    const scene1 = page.getByRole('article', { name: 'Scene 1: INT. CAVE - NIGHT' });
    await scene1.getByRole('button', { name: 'Reference' }).click();
    const picker = page.getByRole('dialog');
    await picker.getByRole('button', { name: 'firelight — Image' }).click();
    await picker.getByRole('button', { name: 'Link 1' }).click();
    await expect(scene1.getByRole('button', { name: 'Open firelight' })).toBeVisible();
    const { data: scenes } = await admin.from('scenes').select('id, heading').eq('script_id', scriptId).is('removed_at', null).order('ordinal');
    expect(scenes!.map((x) => x.heading)).toEqual(['INT. CAVE - NIGHT', 'EXT. ROAD - DAY']);
    const { data: links } = await admin.from('scene_media').select('scene_id, media_id');
    expect(links).toEqual([{ scene_id: scenes![0].id, media_id: uploaded!.id }]);

    // 3. The editor shows the same reference for the scene under the cursor,
    //    and a note written there lands on the scene row.
    await page.goto(`/editor?script=${scriptId}`);
    await page.getByRole('button', { name: 'Refs' }).click();
    await expect(page.getByText('INT. CAVE - NIGHT').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open firelight' })).toBeVisible();
    const note = page.getByPlaceholder('What this scene needs — tone, intent, what the references are for');
    await note.fill('Practical firelight only.');
    await note.blur();
    await expect.poll(async () => (await admin.from('scenes').select('note').eq('id', scenes![0].id).single()).data?.note).toBe('Practical firelight only.');

    // 4. Publish: link-share the project and include the still.
    await openStudio(page, projectId, 'share');
    await page.getByRole('radio', { name: /Anyone with the link/ }).click();
    await page.getByRole('switch', { name: 'Include firelight in the lookbook' }).click();
    await expect(page.getByRole('switch', { name: 'Include firelight in the lookbook' })).toHaveAttribute('aria-checked', 'true');
    const shareUrl = await page.locator('#share-url').inputValue();
    expect(shareUrl).toMatch(/\/shared\/[0-9a-f]{32}$/);

    // 5. A logged-out viewer opens the link: the scene and the image, loaded.
    const viewer = await (browser as Browser).newContext();
    const anon = await viewer.newPage();
    await anon.goto(shareUrl);
    await expect(anon.getByRole('heading', { name: 'The Cave' })).toBeVisible();
    await expect(anon.getByRole('heading', { name: /INT\. CAVE - NIGHT/ })).toBeVisible();
    const img = anon.getByRole('img', { name: 'firelight' });
    await expect(img).toBeVisible();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    // Notes are never shared.
    await expect(anon.getByText('Practical firelight only.')).toHaveCount(0);

    // 6. Back to team-only: the same link now shows nothing.
    await page.getByRole('radio', { name: /^Team/ }).click();
    await expect.poll(async () => (await admin.from('projects').select('visibility').eq('id', projectId).single()).data?.visibility).toBe('team');
    await anon.goto(shareUrl);
    await expect(anon.getByText('This project isn’t shared, or the link is wrong.')).toBeVisible();
    await viewer.close();

    // 7. Crew sees library changes live, without reloading.
    const crewContext = await (browser as Browser).newContext();
    const crew = await crewContext.newPage();
    await signIn(crew, jordan.email);
    await openStudio(crew, projectId, 'library');
    await expect(crew.getByRole('button', { name: 'firelight — Image' })).toBeVisible();
    await page.getByRole('tab', { name: 'Library' }).click();
    await page.getByRole('button', { name: /Add link/ }).click();
    await page.getByLabel('Web address').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(crew.getByRole('button', { name: 'YouTube video — Video' })).toBeVisible({ timeout: 15_000 });
    await crewContext.close();
  });
});
