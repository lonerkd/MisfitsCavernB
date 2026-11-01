import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Campaign deliverables, Export: the buttons hand the browser real files — the piece's working text and a PDF —
// in a real browser against the local stack. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Ad export (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId = '';
  let projectId = '';
  const email = `adx.${TAG}@journey.test`;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    userId = (await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `adx${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Spring ${TAG}`, creator_id: userId, project_type: 'Advertising' }).select('id').single()).data!.id;
    const copy = [
      ['Radio 30', '# HEADLINE\nFresh start for spring\n\n# VO\nOne two three four five six seven\n\n# CTA\nBuy now\n'],
      ['Poster A', '# HEADLINE\nBig spring sale\n\n# BODY\nEverything must go.\n'],
    ] as const;
    for (const [title, content] of copy) {
      const script = (await admin.from('scripts').insert({ title, content, format: 'copy', project_id: projectId, created_by: userId, last_edited_by: userId }).select('id').single()).data!;
      // A copy script in an Advertising project becomes a deliverable on its own; set its kind and notes.
      const { data, error } = await admin.from('deliverables').update({ kind: title.startsWith('Radio') ? 'spot_30' : 'poster', notes: 'Keep it warm.' }).eq('script_id', script.id).select('script_id');
      if (error || !data?.length) throw new Error(`deliverable: ${error?.message ?? 'no row was created for the copy script'}`);
    }
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  test('a piece as text, the whole set as text, and a PDF each download with the real copy in them', async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, acceptDownloads: true });
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
    await page.goto(`/studio?project=${projectId}&tab=share`);
    await expect(page.getByText('Campaign deliverables')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Radio 30').first()).toBeVisible();

    // One piece, plain text.
    let [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('group', { name: 'Export Radio 30' }).getByRole('button', { name: 'Text' }).click()]);
    expect(download.suggestedFilename()).toBe(`spring-${TAG}-radio-30.txt`);
    let text = readFileSync((await download.path())!, 'utf8');
    expect(text).toContain('Radio 30');
    expect(text).toContain('Fresh start for spring');
    expect(text).toContain('Keep it warm.');

    // The whole set, plain text.
    [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('group', { name: 'Export the whole campaign' }).getByRole('button', { name: 'Text' }).click()]);
    expect(download.suggestedFilename()).toBe(`spring-${TAG}.txt`);
    text = readFileSync((await download.path())!, 'utf8');
    expect(text).toContain('2 pieces');
    expect(text).toContain('Big spring sale');
    expect(text).toContain('Fresh start for spring');

    // A piece as a PDF.
    [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('group', { name: 'Export Poster A' }).getByRole('button', { name: 'PDF' }).click()]);
    expect(download.suggestedFilename()).toBe(`spring-${TAG}-poster-a.pdf`);
    const pdf = readFileSync((await download.path())!);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.toString('latin1')).toContain('Big spring sale');
    } finally { await ctx.close(); }
  });
});
