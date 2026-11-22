import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { SupabaseClient } from '@supabase/supabase-js';

// Campaign deliverables, Export: the buttons hand the browser real files — the piece's working text and a PDF —
// in a real browser against the local stack. Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Ad export (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  let userId = '';
  let projectId = '';
  const email = `adx.${TAG}@journey.test`;

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    userId = (await stack.createUser({ email, password: PASSWORD, username: `adx${TAG}` })).id;
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
  });

  test('a piece and the whole set download as text, and a piece prints (Print / PDF) with the real copy in them', async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, acceptDownloads: true });
    const page = await ctx.newPage();
    try {
    await signInAs(page, { email: email, password: PASSWORD });
    await page.goto('/studio');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    await page.goto(`/studio?project=${projectId}&tab=share`);
    await expect(page.getByText('Campaign deliverables')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('group', { name: 'Export Radio 30' })).toBeVisible();

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
    // It goes through the print kit (the project's colour and logo; "Save as PDF" is in the print dialog): a hidden
    // frame holds the printable document and opens the dialog, so there is no file download to wait for.
    await page.evaluate(() => {
      const w = window as unknown as { __printed: string[] };
      w.__printed = [];
      new MutationObserver((records) => {
        for (const r of records) for (const n of Array.from(r.addedNodes)) if (n instanceof HTMLIFrameElement && n.srcdoc) w.__printed.push(n.srcdoc);
      }).observe(document.body, { childList: true });
    });
    await page.getByRole('group', { name: 'Export Poster A' }).getByRole('button', { name: 'Print / PDF' }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __printed: string[] }).__printed.join('\n'))).toContain('Big spring sale');
    } finally { await ctx.close(); }
  });

  test('a past review version prints as it was sent, not as the piece reads today', async ({ browser }) => {
    test.setTimeout(120_000);
    const script = (await admin.from('scripts').select('id').eq('project_id', projectId).eq('title', 'Poster A').single()).data!;
    // The database takes the snapshot when the version is proposed; send it, then change the piece.
    const v = await admin.from('item_versions').insert({ project_id: projectId, script_id: script.id, label: 'First look' }).select('id, snapshot').single();
    expect(v.error).toBeNull();
    expect(v.data!.snapshot).toContain('Big spring sale');
    expect((await admin.from('item_versions').update({ status: 'sent' }).eq('id', v.data!.id)).error).toBeNull();
    await admin.from('scripts').update({ content: '# HEADLINE\nA changed headline\n\n# BODY\nNew body.\n' }).eq('id', script.id);

    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    const page = await ctx.newPage();
    try {
      await signInAs(page, { email: email, password: PASSWORD });
      await page.goto(`/studio?project=${projectId}&tab=share`);
      await expect(page.getByText('Campaign deliverables')).toBeVisible({ timeout: 30_000 });
      await page.evaluate(() => {
        const w = window as unknown as { __printed: string[] };
        w.__printed = [];
        new MutationObserver((records) => {
          for (const r of records) for (const n of Array.from(r.addedNodes)) if (n instanceof HTMLIFrameElement && n.srcdoc) w.__printed.push(n.srcdoc);
        }).observe(document.body, { childList: true });
      });
      await page.getByLabel('Print a past version of Poster A').selectOption(v.data!.id);
      await expect.poll(() => page.evaluate(() => (window as unknown as { __printed: string[] }).__printed.join('\n'))).toContain('Big spring sale');
      const printed = await page.evaluate(() => (window as unknown as { __printed: string[] }).__printed.join('\n'));
      expect(printed).not.toContain('A changed headline');
      expect(printed).toContain('(v1)');
    } finally { await ctx.close(); }
  });
});
