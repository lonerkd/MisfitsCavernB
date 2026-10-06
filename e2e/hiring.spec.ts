import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Browser } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The hiring loop in real browsers against a local stack: a casting call
// written from the Casting board, an actor applies from the card with a
// note, the owner accepts — cast, on the crew, posting closed — and the actor
// sees it in My jobs. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Hiring loop (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const owner = { id: '', email: `hire-owner.${TAG}@journey.test`, name: `hireowner${TAG}` };
  const actor = { id: '', email: `hire-actor.${TAG}@journey.test`, name: `hireactor${TAG}` };
  let projectId: string;

  const signIn = async (browser: Browser, who: typeof owner) => {
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
    for (const who of [owner, actor]) {
      const { data } = await admin.auth.admin.createUser({ email: who.email, password: PASSWORD, email_confirm: true, user_metadata: { username: who.name } });
      who.id = data.user!.id;
    }
    projectId = (await admin.from('projects').insert({ title: `Tidewater ${TAG}`, creator_id: owner.id, status: 'pre-production' }).select('id').single()).data!.id;
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('jobs').delete().eq('created_by', owner.id);
    await admin.from('projects').delete().eq('id', projectId);
    for (const who of [owner, actor]) await admin.auth.admin.deleteUser(who.id);
  });

  test('casting call → apply from the card → accept → cast and on the crew', async ({ browser }) => {
    test.setTimeout(150_000);
    const sam = await signIn(browser, owner);
    // Make the project active, then open a casting call as the Casting board links it.
    await sam.goto('/studio');
    const picker = sam.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    await sam.goto(`/jobs?${new URLSearchParams({ title: 'Casting: Maya', role: 'Actor', character: 'Maya', description: 'Casting Maya.' })}`);
    await expect(sam.getByText(/casting call for/)).toBeVisible({ timeout: 20_000 });
    await sam.getByRole('button', { name: 'Post Position' }).click();
    await expect.poll(async () => (await admin.from('jobs').select('character_name, project_id').eq('created_by', owner.id)).data)
      .toEqual([{ character_name: 'Maya', project_id: projectId }]);
    const jobId = (await admin.from('jobs').select('id').eq('created_by', owner.id).single()).data!.id;

    // The actor applies from the card, with a note.
    const ana = await signIn(browser, actor);
    await ana.goto('/jobs');
    const card = ana.getByTestId('job-card').filter({ hasText: 'Casting call · the role of Maya' });
    await card.getByRole('button', { name: /Apply/ }).click();
    await card.getByLabel(/A note to/).fill('Stage and screen, reel on my profile.');
    await card.getByRole('button', { name: 'Send application' }).click();
    await expect(card.getByRole('status')).toHaveText(/Applied · pending/i);
    expect((await admin.from('job_applications').select('cover_note').eq('job_id', jobId).single()).data?.cover_note).toBe('Stage and screen, reel on my profile.');

    // The owner's own postings count the application.
    await sam.goto('/jobs');
    await sam.getByRole('button', { name: /^My Jobs/ }).click();
    await expect(sam.getByText('Casting: Maya')).toBeVisible();
    await expect(sam.getByText('1 applicant', { exact: true })).toBeVisible();

    // The owner accepts; the posting closes.
    await sam.goto(`/jobs/${jobId}`);
    await expect(sam.getByText(/Accepting adds them to Tidewater .* crew as Actor and casts them as Maya/)).toBeVisible({ timeout: 20_000 });
    await sam.getByRole('button', { name: /^accept$/i }).click();
    await expect.poll(async () => (await admin.from('character_castings').select('crew_user_id').eq('project_id', projectId).eq('character_name', 'MAYA').maybeSingle()).data?.crew_user_id).toBe(actor.id);
    expect((await admin.from('project_crew').select('craft, status').eq('project_id', projectId).eq('user_id', actor.id).single()).data).toEqual({ craft: 'Actor', status: 'confirmed' });
    expect((await admin.from('jobs').select('status').eq('id', jobId).single()).data?.status).toBe('closed');

    // The actor sees it.
    await ana.goto('/jobs');
    await ana.getByRole('button', { name: /^My Jobs/ }).click();
    await expect(ana.getByText('Casting: Maya')).toBeVisible();
    await expect(ana.getByText('Accepted', { exact: true })).toBeVisible();
  });
});
