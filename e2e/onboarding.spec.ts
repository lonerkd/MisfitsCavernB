import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Onboarding against a local stack: /welcome asks how you work (it sets the
// guides' depth), starts a first project with a few brief answers and opens
// the tool for its first step; the projects board searches, shows each
// project's next step, and archives/restores.
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

async function axeViolations(page: Page): Promise<string[]> {
  // Let entrance animations finish (looping ones never do).
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
    .map((a) => a.finished.catch(() => undefined))));
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)} ${n.any?.[0]?.message ?? ''}`).join(' | ')}`);
  });
}

test.describe('Onboarding + the projects board (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const users: string[] = [];

  const newUser = async (prefix: string) => {
    const email = `${prefix}.${TAG}@journey.test`;
    const { data } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `${prefix}${TAG}` } });
    users.push(data.user!.id);
    return { id: data.user!.id, email };
  };

  const signIn = async (page: Page, email: string) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
  };

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  });

  test.afterAll(async () => {
    if (!admin) return;
    for (const id of users) {
      await admin.from('scripts').delete().eq('created_by', id);
      await admin.from('projects').delete().eq('creator_id', id);
      await admin.auth.admin.deleteUser(id);
    }
  });

  test('welcome → a first project with a head start → straight into the script', async ({ page }) => {
    test.setTimeout(120_000);
    const me = await newUser('wel');
    await signIn(page, me.email);
    await page.goto('/welcome');

    await expect(page.getByRole('heading', { name: 'What do you do?' })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Skip' }).click();
    // How they work sets how deep every project's guide goes.
    await expect(page.getByRole('heading', { name: 'How do you work?' })).toBeVisible();
    await page.getByRole('radiogroup', { name: 'How much have you made before?' }).getByRole('radio', { name: /^This is my first/ }).click();
    await page.getByRole('radiogroup', { name: 'Hours a week' }).getByRole('radio', { name: '3h' }).click();
    await page.getByRole('radiogroup', { name: 'Who’s making it with you?' }).getByRole('radio', { name: /^Just me/ }).click();
    await expect(page.getByRole('radio', { name: /^Match my experience/ })).toContainText('walk me through it');
    const guideViolations = await axeViolations(page);
    expect(guideViolations, guideViolations.join('\n')).toEqual([]);
    await page.getByRole('button', { name: /Continue/ }).click();
    await expect(page.getByRole('heading', { name: 'What brings you here?' })).toBeVisible();
    await expect.poll(async () => (await admin.from('profiles').select('ui_prefs').eq('id', me.id).single()).data?.ui_prefs?.guide)
      .toEqual({ hours: 3, experience: 'first', team: 'solo' });
    await expect(page.getByRole('link', { name: /Find work on a crew/ })).toHaveAttribute('href', '/jobs');
    await page.getByRole('button', { name: /Make something/ }).click();

    await expect(page.getByRole('heading', { name: 'Start your first project' })).toBeVisible();
    await page.getByLabel('Title').fill(`Lantern Road ${TAG}`);
    await page.getByLabel('Logline (optional)').fill('A night courier finds a lantern that shows the next hour.');
    await page.getByRole('radiogroup', { name: 'Where is it now?' }).getByRole('radio', { name: 'Writing it' }).click();
    // The format's first brief questions, as choices.
    await page.getByRole('group', { name: 'Genre' }).getByRole('button', { name: 'Drama' }).click();
    await page.getByRole('radiogroup', { name: 'Tone' }).getByRole('radio', { name: 'Grounded' }).click();
    await expect(page.getByRole('radio', { name: 'Grounded' })).toHaveAttribute('aria-checked', 'true');
    await page.screenshot({ path: 'test-results/welcome.png', fullPage: true });
    const violations = await axeViolations(page);
    expect(violations, violations.join('\n')).toEqual([]);

    await page.getByRole('button', { name: /Create & start writing/ }).click();
    // A logline is there, so the first step is the script.
    await page.waitForURL(/\/editor/, { timeout: 30_000 });
    const project = (await admin.from('projects').select('id, project_type, description, status').eq('creator_id', me.id).single()).data!;
    expect(project.description).toContain('lantern');
    expect(project.status).toBe('concept');
    const brief = (await admin.from('project_brief').select('question, value').eq('project_id', project.id).order('question')).data;
    expect(brief).toEqual([{ question: 'genre', value: ['drama'] }, { question: 'tone', value: 'grounded' }]);
    await expect.poll(async () => (await admin.from('scripts').select('id').eq('project_id', project.id)).data?.length, { timeout: 20_000 }).toBe(1);
  });

  test('the board: next steps, search, archive and restore', async ({ page }) => {
    test.setTimeout(120_000);
    const me = await newUser('brd');
    const [noir, western] = (await admin.from('projects').insert([
      { title: `Alpha Noir ${TAG}`, creator_id: me.id, description: 'A singer lies to the wrong detective.' },
      { title: `Beta Western ${TAG}`, creator_id: me.id },
    ]).select('id, title')).data!.sort((a, b) => a.title.localeCompare(b.title));
    await signIn(page, me.email);
    await page.goto('/projects');

    const noirCard = page.getByRole('link', { name: new RegExp(`Alpha Noir ${TAG}`) });
    await expect(noirCard).toBeVisible({ timeout: 20_000 });
    // The logline is written, so its next step is the script; the other still needs one.
    await expect(noirCard).toContainText('Next: Start the script');
    await expect(page.getByRole('link', { name: new RegExp(`Beta Western ${TAG}`) })).toContainText('Next: Write the logline');

    await page.getByRole('searchbox', { name: 'Search projects' }).fill('singer');
    await expect(page.getByRole('link', { name: new RegExp(`Beta Western ${TAG}`) })).toHaveCount(0);
    await expect(noirCard).toBeVisible();
    await expect(page.getByText('1 match')).toBeVisible();
    await page.screenshot({ path: 'test-results/projects-board.png', fullPage: true });
    expect(await axeViolations(page), 'board').toEqual([]);

    await page.getByRole('button', { name: `Archive “${noir.title}”` }).click();
    await expect.poll(async () => (await admin.from('projects').select('archived_at').eq('id', noir.id).single()).data?.archived_at).not.toBeNull();
    await expect(noirCard).toHaveCount(0);
    await expect(page.getByText(`No project matches “singer”`)).toBeVisible();
    await expect(page.getByText('An archived project does — look under Archived.')).toBeVisible();

    await page.getByRole('button', { name: /Archived \(1\)/ }).click();
    await page.getByRole('button', { name: `Restore “${noir.title}”` }).click();
    await expect.poll(async () => (await admin.from('projects').select('archived_at').eq('id', noir.id).single()).data?.archived_at).toBeNull();
    expect(western.id).toBeTruthy();
  });
});
