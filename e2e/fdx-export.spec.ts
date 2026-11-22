import { readFileSync } from 'node:fs';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';

// Wishlist 4.9: the Final Draft export writes real elements. Sam exports a script with a dual-dialogue pair, a centered line and a title
// page through the Export menu: the downloaded .fdx is the real file (a <DualDialogue>, a centered paragraph, a <TitlePage>), carries no
// Fountain markers as text, and the person is told it worked. Opt-in: E2E_LOCAL_STACK=1.
const SCRIPT = [
  'Title: Probe & Co', 'Author: Sam', '',
  'INT. ROOM - DAY', '', 'STEEL', 'Hello.', '', 'MAYA ^', 'Hi.', '', '> THE END <', '',
].join('\n');

test.describe('Final Draft export (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  test('Export › .FDX downloads real dual-dialogue, centered and title-page elements, and says so', async ({ page, stack }) => {
    test.setTimeout(120_000);
    const owner = await stack.createUser({ label: 'fdx' });
    const project = await stack.createProject(owner, { title: `Fdx ${stack.tag}`, status: 'pre-production' });
    const script = (await stack.insert('scripts', { title: 'Probe', content: SCRIPT, project_id: project.id, created_by: owner.id, last_edited_by: owner.id })).id;

    await signInAs(page, owner);
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`/editor?script=${script}`);
    await expect(page.getByRole('textbox', { name: 'Script', exact: true })).toHaveValue(SCRIPT, { timeout: 30_000 });

    await page.getByRole('button', { name: /^Export/ }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('menu', { name: 'Export' }).getByRole('button', { name: /\.FDX/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.fdx$/);
    const xml = readFileSync((await download.path())!, 'utf8');

    expect(xml).toContain('<FinalDraft');
    expect(xml).toContain('<DualDialogue>');
    expect(xml).toContain('Alignment="Center"');
    expect(xml).toContain('<TitlePage>');
    expect(xml).toContain('Probe &amp; Co'); // escaped, so the file is well-formed
    expect(xml).not.toMatch(/<Text>[^<]*\^/); // no caret left in any text
    expect(xml).not.toContain('&gt; THE END &lt;'); // the centering markers are not text
    await expect(page.getByText('Exported as .fdx (Final Draft)')).toBeVisible();
  });
});
