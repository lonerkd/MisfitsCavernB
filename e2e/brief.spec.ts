import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The project brief against a local stack: answer it as choices on the
// project page; the analysis names what the project needs (roles with a
// prefilled job post, the script against its target length); the Lounge
// offers the channels the phase calls for. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const SCRIPT = [
  'EXT. FOREST - NIGHT', '', 'MAYA runs through the trees. Something follows.', '',
  'MAYA', 'Who’s there?', '',
  'INT. CABIN - NIGHT', '', 'She bolts the door.', '',
].join('\n');

test.describe('Project brief (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId: string;
  let email: string;
  let projectId: string;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    email = `brief.${TAG}@journey.test`;
    const { data } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `brief${TAG}` } });
    userId = data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Cabin ${TAG}`, creator_id: userId, status: 'pre-production', project_type: 'Short Film' }).select('id').single()).data!.id;
    await admin.from('scripts').insert({ title: 'Cabin', content: SCRIPT, project_id: projectId, created_by: userId, last_edited_by: userId });
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    await admin.auth.admin.deleteUser(userId);
  });

  test('answer the brief; it names what the project needs and prefills the job', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/auth');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    await page.goto(`/projects/${projectId}`);
    const brief = page.getByRole('region', { name: /What are you making|Horror/ });
    await expect(brief).toBeVisible({ timeout: 20_000 });

    // Development: genre and a target length.
    await brief.getByRole('tab', { name: /^Development/ }).click();
    await brief.getByRole('group', { name: 'Genre' }).getByRole('button', { name: 'Horror' }).click();
    await expect(brief.getByRole('heading', { name: 'Horror' })).toBeVisible({ timeout: 10_000 });
    const length = brief.getByLabel('Target length');
    await length.fill('1');
    await length.press('Enter');
    await expect.poll(async () => (await admin.from('project_brief').select('value').eq('project_id', projectId).eq('question', 'target_runtime').maybeSingle()).data?.value).toBe(1);

    // Pre-production: night exteriors.
    await brief.getByRole('tab', { name: /^Pre-Production/ }).click();
    await brief.getByRole('group', { name: 'Anything special on set?' }).getByRole('button', { name: 'Night exteriors' }).click();
    await expect.poll(async () => (await admin.from('project_brief').select('value').eq('project_id', projectId).eq('question', 'needs').maybeSingle()).data?.value).toEqual(['night']);

    // What it needs: the roles, from the choices.
    const moves = brief.getByRole('list', { name: 'Next moves' });
    await expect(moves.getByText(/^Roles this project needs: .*Gaffer/)).toBeVisible({ timeout: 10_000 });
    await expect(moves.getByText(/Because of .*Horror/)).toBeVisible();

    // A role's job post arrives written from the project.
    await moves.getByRole('link', { name: 'Post a job for a Gaffer' }).click();
    await page.waitForURL(/\/jobs\?/);
    await expect(page.locator('input[value^="Gaffer — Cabin"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('textarea')).toHaveValue(/Why we need a gaffer: Night exteriors\./);
    await expect(page.locator('textarea')).toHaveValue(/Short Film — Horror/);
  });

  test('the Lounge offers the channels this phase calls for', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/auth');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    await page.goto('/lounge');
    const suggested = page.getByRole('group', { name: 'Suggested channels' });
    await expect(suggested).toBeVisible({ timeout: 20_000 });
    await expect(suggested.getByRole('button', { name: 'Open #legal for Owners' })).toBeVisible();
    await expect(suggested.getByRole('button', { name: /#dailies/ })).toHaveCount(0); // that's for the shoot
    await suggested.getByRole('button', { name: 'Open #legal for Owners' }).click();
    await expect(page.getByRole('button', { name: 'legal', exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(suggested.getByRole('button', { name: 'Open #legal for Owners' })).toHaveCount(0);
    await expect.poll(async () => (await admin.from('channels').select('audience, type').eq('project_id', projectId).eq('name', 'legal').maybeSingle()).data)
      .toEqual({ audience: 'owners', type: 'text' });
  });
});
