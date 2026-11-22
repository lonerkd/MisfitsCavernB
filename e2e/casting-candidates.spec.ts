import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';

// BACKLOG 4.15: a shortlist per role on the Casting Board (a name, a status, a reel link and a note), kept across a reload, printed with the
// casting sheet, and invisible to an outsider. Opt-in: E2E_LOCAL_STACK=1.
const SCRIPT = ['INT. DOCK OFFICE - NIGHT', '', 'MAYA', 'We close at ten.', '', 'LUIS', 'Then we have an hour.', ''].join('\n');

test.describe('Casting candidates (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  test('shortlist, set a status, reload, print the sheet, remove', async ({ page, stack }) => {
    test.setTimeout(240_000);
    const sam = await stack.createUser({ label: 'cast' });
    const project = await stack.createProject(sam, { title: `Cast ${stack.tag}`, status: 'pre-production' });
    await stack.insert('scripts', { title: 'Pier', content: SCRIPT, project_id: project.id, created_by: sam.id, last_edited_by: sam.id });
    await signInAs(page, sam);
    await page.setViewportSize({ width: 1400, height: 1000 });
    await page.goto(`/studio?project=${project.id}&tab=production&view=crew`);
    await page.getByRole('button', { name: /^MAYA/ }).click({ timeout: 60_000 });

    await page.getByLabel('Candidate name').fill('Ana Reyes');
    await page.getByLabel('Reel link').fill('vimeo.com/123');
    await page.getByLabel('Candidate note').fill('Strong <b>tape</b>');
    await page.getByRole('button', { name: 'Shortlist' }).click();
    const card = page.getByTestId('candidate');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Ana Reyes');
    await expect(card.getByRole('link', { name: /Watch reel/ })).toHaveAttribute('href', 'https://vimeo.com/123');

    // A reel link that is not a web address is refused with a message, and nothing is added.
    await page.getByLabel('Candidate name').fill('Bo Lin');
    await page.getByLabel('Reel link').fill('javascript:alert(1)');
    await page.getByRole('button', { name: 'Shortlist' }).click();
    await expect(page.getByText('A reel link must start with http')).toBeVisible();
    await expect(card).toHaveCount(1);

    await page.getByLabel('Status for Ana Reyes').selectOption('callback');
    await expect.poll(async () => (await stack.admin.from('casting_candidates').select('status').eq('project_id', project.id)).data?.[0]?.status).toBe('callback');

    await page.reload();
    await page.getByRole('button', { name: /^MAYA/ }).click({ timeout: 60_000 });
    await expect(page.getByLabel('Status for Ana Reyes')).toHaveValue('callback');

    // The casting sheet prints the shortlist, and the note's markup prints as text.
    await page.evaluate(() => {
      const w = window as unknown as { __printed: string[] };
      w.__printed = [];
      new MutationObserver((records) => { for (const r of records) for (const n of Array.from(r.addedNodes)) if (n instanceof HTMLIFrameElement && n.srcdoc) w.__printed.push(n.srcdoc); }).observe(document.body, { childList: true });
    });
    await page.getByRole('button', { name: 'Print / PDF: the casting sheet' }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __printed: string[] }).__printed.join('\n'))).toContain('Casting sheet');
    const printed = await page.evaluate(() => (window as unknown as { __printed: string[] }).__printed.join('\n'));
    for (const s of ['MAYA', 'Ana Reyes', 'callback', 'https://vimeo.com/123']) expect(printed).toContain(s);
    expect(printed).not.toContain('<b>tape</b>');

    await page.getByRole('button', { name: 'Remove Ana Reyes' }).click();
    await page.getByRole('button', { name: 'CONFIRM' }).click();
    await expect.poll(async () => (await stack.admin.from('casting_candidates').select('id').eq('project_id', project.id)).data?.length).toBe(0);
  });

  test('an outsider sees no shortlist', async ({ page, stack }) => {
    test.setTimeout(90_000);
    const sam = await stack.createUser({ label: 'castown' });
    const riley = await stack.createUser({ label: 'castriley' });
    const project = await stack.createProject(sam, { title: `Private ${stack.tag}`, status: 'pre-production' });
    await stack.insert('casting_candidates', { project_id: project.id, character_name: 'MAYA', name: 'Secret Candidate', created_by: sam.id });
    await signInAs(page, riley);
    await page.goto(`/studio?project=${project.id}&tab=production&view=crew`);
    await page.waitForTimeout(4000);
    await expect(page.getByText('Secret Candidate')).toHaveCount(0);
  });
});
