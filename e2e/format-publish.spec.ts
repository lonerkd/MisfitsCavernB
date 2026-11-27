import { readFileSync } from 'node:fs';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';

// BACKLOG 3.51 gap 2: the publishing step for the non-screenplay formats. A YouTube creator exports a
// publish package built from the script's own words (title options, description, chapters, tags); a prose
// writer exports the publish-ready Markdown file; a game writer exports a build sheet (structure, cast,
// the script and its jumps). All are real downloads through the Export menu.
// Opt-in: E2E_LOCAL_STACK=1.
const VIDEO = [
  'HOOK',
  '[Close-up of the broken camera]',
  'What if your camera died mid-shoot?',
  'HOST: It happened to me last spring.',
  '0:45 - SPONSOR',
  '[Logo animation]',
  'This video is brought to you by nobody.',
].join('\n');

const PROSE = [
  '# The Quiet Craft of Editing',
  'The best cuts are the ones nobody notices on the first watch.',
  '## Rhythm before polish',
  'Editors talk about rhythm the way drummers do, in counts and rests.',
].join('\n');

const GAME = [
  'ACT 1: THE HARBOUR',
  '[SET met_ines = false]',
  'Fog sits on the water. A bell rings somewhere.',
  'INES: You are late.',
  '* Apologise',
  '* Ask who she is',
  '[IF met_ines]',
  'INES: We have met.',
  '-> act1_dock',
].join('\n');

test.describe('Format publish exports (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  test('a video script exports a publish package from its own words', async ({ page, stack }) => {
    test.setTimeout(120_000);
    const owner = await stack.createUser({ label: 'vidpub' });
    const project = await stack.createProject(owner, { title: `Vidpub ${stack.tag}`, status: 'pre-production' });
    const script = (await stack.insert('scripts', { title: 'Dead Camera', format: 'video-script', content: VIDEO, project_id: project.id, created_by: owner.id, last_edited_by: owner.id })).id;

    await signInAs(page, owner);
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`/editor?script=${script}`);
    await expect(page.getByRole('textbox', { name: 'Script', exact: true })).toHaveValue(VIDEO, { timeout: 30_000 });

    await page.getByRole('button', { name: /^Export/ }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('menu', { name: 'Export' }).getByRole('button', { name: /Publish package/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/-publish\.md$/);
    const md = readFileSync((await download.path())!, 'utf8');
    expect(md).toContain('# Publish package — Dead Camera');
    expect(md).toContain('What if your camera died mid-shoot?');
    expect(md).toContain('0:45 SPONSOR');
    expect(md).toContain('## Tags');
    await expect(page.getByText('Publish package saved as .md')).toBeVisible();
  });

  test('a prose script exports publish-ready Markdown in article shape', async ({ page, stack }) => {
    test.setTimeout(120_000);
    const owner = await stack.createUser({ label: 'prosepub' });
    const project = await stack.createProject(owner, { title: `Prosepub ${stack.tag}`, status: 'pre-production' });
    const script = (await stack.insert('scripts', { title: 'Quiet Craft', format: 'prose', content: PROSE, project_id: project.id, created_by: owner.id, last_edited_by: owner.id })).id;

    await signInAs(page, owner);
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`/editor?script=${script}`);
    await expect(page.getByRole('textbox', { name: 'Script', exact: true })).toHaveValue(PROSE, { timeout: 30_000 });

    await page.getByRole('button', { name: /^Export/ }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('menu', { name: 'Export' }).getByRole('button', { name: /Markdown/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.md$/);
    const md = readFileSync((await download.path())!, 'utf8');
    expect(md).toMatch(/^# Quiet Craft/);
    expect(md).toContain('## Rhythm before polish');
    expect(md).toContain('The best cuts are the ones nobody notices on the first watch.');
    await expect(page.getByText('Exported as .md')).toBeVisible();
  });

  test('a game script exports a build sheet from its own structure', async ({ page, stack }) => {
    test.setTimeout(120_000);
    const owner = await stack.createUser({ label: 'gamepub' });
    const project = await stack.createProject(owner, { title: `Gamepub ${stack.tag}`, status: 'pre-production' });
    const script = (await stack.insert('scripts', { title: 'Harbour Bell', format: 'game-script', content: GAME, project_id: project.id, created_by: owner.id, last_edited_by: owner.id })).id;

    await signInAs(page, owner);
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`/editor?script=${script}`);
    await expect(page.getByRole('textbox', { name: 'Script', exact: true })).toHaveValue(GAME, { timeout: 30_000 });

    await page.getByRole('button', { name: /^Export/ }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('menu', { name: 'Export' }).getByRole('button', { name: /Build sheet/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/-build\.md$/);
    const md = readFileSync((await download.path())!, 'utf8');
    expect(md).toContain('# Build sheet — Harbour Bell');
    expect(md).toContain('ACT 1: THE HARBOUR — 2 lines, 2 choices, 1 jump');
    expect(md).toContain('INES: You are late.');
    expect(md).toContain('ACT 1: THE HARBOUR -> act1_dock');
    await expect(page.getByText('Build sheet saved as .md')).toBeVisible();
  });
});
