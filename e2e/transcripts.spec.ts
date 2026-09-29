import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Transcripts and the paper edit in a real browser against a local stack: a
// transcript pasted onto an interview in the Library, lines starred, then put
// in story order in Post › Paper edit — saved for the team. Opt-in:
// E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

async function axeViolations(page: Page, selector: string): Promise<string[]> {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async (sel) => {
    const r = await (window as any).axe.run(sel, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)}`).join(' | ')}`);
  }, selector);
}

async function openStudio(page: Page, projectId: string, tab: string) {
  await page.goto(`/studio?tab=${tab}`);
  const picker = page.getByLabel('Active project');
  await expect(picker).toBeVisible({ timeout: 30_000 });
  if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
}

test.describe('Transcripts and the paper edit (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const owner = { id: '', email: `transcripts.${TAG}@journey.test` };
  let projectId: string;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    owner.id = (await admin.auth.admin.createUser({ email: owner.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `docmaker${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Tidewater ${TAG}`, creator_id: owner.id, status: 'post-production' }).select('id').single()).data!.id;
    await admin.from('media').insert({ project_id: projectId, kind: 'video', title: 'Ana interview', external_url: 'https://example.com/ana.mp4', created_by: owner.id });
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
    await admin.auth.admin.deleteUser(owner.id);
  });

  test('paste a transcript, star the moments, order the paper edit', async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto('/auth');
    await page.fill('input[name="email"]', owner.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    await openStudio(page, projectId, 'library');
    await page.getByRole('button', { name: 'Ana interview — Video' }).click({ timeout: 30_000 });
    const transcript = page.getByRole('region', { name: /^Transcript/ });
    await transcript.getByRole('button', { name: 'Paste a transcript' }).click();
    await transcript.getByLabel('Paste subtitles (SRT, WebVTT) or text').fill(
      '[00:00:05] Interviewer: When did you start?\n[00:00:09] Ana: In 1998, on the docks.\n[00:00:20] Ana: That was the year it flooded.',
    );
    await expect(transcript.getByText('3 lines found · 3 with a time')).toBeVisible();
    await transcript.getByRole('button', { name: 'Add 3 lines' }).click();
    const lines = transcript.getByRole('list', { name: 'Transcript lines' });
    await expect(lines.getByRole('listitem')).toHaveCount(3);
    await expect(lines).toContainText('0:09');

    // Star the flood first, then the docks.
    await lines.getByRole('button', { name: /^Add to the paper edit: That was the year/ }).click();
    await lines.getByRole('button', { name: /^Add to the paper edit: In 1998/ }).click();
    await expect(lines.getByRole('button', { name: /^Take out of the paper edit/ })).toHaveCount(2);
    const violations = await axeViolations(page, '[role="dialog"]');
    expect(violations, violations.join('\n')).toEqual([]);
    await page.keyboard.press('Escape');

    await openStudio(page, projectId, 'post');
    await page.getByRole('tab', { name: 'Paper edit' }).click();
    const paper = page.getByRole('region', { name: 'Paper edit' });
    await expect(paper.getByRole('listitem').first()).toContainText('That was the year it flooded.');
    await expect(paper).toContainText('2 selects · about 0:11 + 1 untimed');
    await paper.getByRole('button', { name: 'Move select 2 up' }).click();
    await expect(paper.getByRole('listitem').first()).toContainText('In 1998, on the docks.');

    // Saved for the team, in that order.
    await expect.poll(async () => {
      const { data } = await admin.from('transcript_lines').select('text').eq('project_id', projectId).not('paper_order', 'is', null).order('paper_order');
      return data?.map((r) => r.text);
    }, { timeout: 15_000 }).toEqual(['In 1998, on the docks.', 'That was the year it flooded.']);
    const paperViolations = await axeViolations(page, 'section[aria-label="Paper edit"]');
    expect(paperViolations, paperViolations.join('\n')).toEqual([]);
  });
});
