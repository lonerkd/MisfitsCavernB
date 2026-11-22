import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';

// BACKLOG 3.54, slice 3: a Notes project's Overview opens on notes (a capture box, the documents, Library counts, people); a film's
// Overview is unchanged. Opt-in: E2E_LOCAL_STACK=1.
test.describe('The Overview of a Notes project (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  test('capture a note, start a document; a film keeps its Overview', async ({ page, stack }) => {
    test.setTimeout(240_000);
    const sam = await stack.createUser({ label: 'notesov' });
    const notesTitle = `NotesOv ${stack.tag}`;
    const filmTitle = `FilmOv ${stack.tag}`;
    const notes = await stack.createProject(sam, { title: notesTitle, status: 'concept' });
    await stack.admin.from('projects').update({ project_type: 'Notes' }).eq('id', notes.id);
    const film = await stack.createProject(sam, { title: filmTitle, status: 'concept' });
    await stack.admin.from('projects').update({ project_type: 'Short Film' }).eq('id', film.id);

    await signInAs(page, sam);
    await page.setViewportSize({ width: 1400, height: 1000 });
    const openStudio = async (title: string) => {
      await page.goto('/studio');
      await page.getByRole('combobox', { name: 'Active project' }).selectOption({ label: title });
    };

    await openStudio(notesTitle);
    const capture = page.getByRole('textbox', { name: 'Quick note' });
    await expect(capture).toBeVisible({ timeout: 40_000 });
    // The film-shaped counts are gone.
    await expect(page.getByText('Wrapped', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Budget', { exact: true })).toHaveCount(0);

    // Typing a note and pressing Enter saves it to the project.
    const body = `Idea ${stack.tag}`;
    await capture.fill(body);
    await capture.press('Enter');
    await expect(page.getByText(body, { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(capture).toHaveValue('');
    await expect.poll(async () => {
      const { data } = await stack.admin.from('notes').select('scope, body, project_id').eq('project_id', notes.id).eq('body', body);
      return data?.length === 1 && data[0].scope === 'project';
    }, { timeout: 20_000 }).toBe(true);

    // A new document is a script row and opens in the editor.
    await page.getByRole('textbox', { name: 'Document title' }).fill(`Treatment ${stack.tag}`);
    await page.getByRole('button', { name: 'New document' }).click();
    await expect(page).toHaveURL(/\/editor\?script=[0-9a-f-]{36}/, { timeout: 40_000 });
    const { data: scripts } = await stack.admin.from('scripts').select('id, title, format').eq('project_id', notes.id);
    expect(scripts).toHaveLength(1);
    expect(scripts?.[0].title).toBe(`Treatment ${stack.tag}`);

    // A film project's Overview is unchanged: its counts, no capture box.
    await openStudio(filmTitle);
    await expect(page.getByText('Wrapped', { exact: true })).toBeVisible({ timeout: 40_000 });
    await expect(page.getByText('Crew', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Quick note' })).toHaveCount(0);
  });
});
