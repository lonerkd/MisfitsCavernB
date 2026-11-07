import { describe, expect, it, vi } from 'vitest';
import { useFake } from '@/tests/unit-support/fakeSupabase';

vi.mock('./client', async () => ({ supabase: (await import('@/tests/unit-support/fakeSupabase')).supabaseProxy }));
import { addNote, deleteNote, editNote, listNotes, noteDraftProblem } from './notes';

const row = { id: 'n1', scope: 'private', body: 'hi' };

describe('noteDraftProblem', () => {
  it('needs text, a script for writer notes and a project for project notes', () => {
    expect(noteDraftProblem('private', '  ', {})).toMatch(/something/);
    expect(noteDraftProblem('private', 'x'.repeat(4001), {})).toMatch(/4000/);
    expect(noteDraftProblem('writer', 'x', { projectId: 'p' })).toMatch(/script/);
    expect(noteDraftProblem('project', 'x', { scriptId: 's' })).toMatch(/project/);
    expect(noteDraftProblem('private', 'x', {})).toBeNull();
    expect(noteDraftProblem('writer', 'x', { scriptId: 's' })).toBeNull();
  });
});

describe('listNotes', () => {
  it('asks for nothing without a place', async () => {
    const f = useFake();
    expect(await listNotes({})).toEqual([]);
    expect(f.calls).toEqual([]);
  });
  it('filters by script, or by project without script-level notes', async () => {
    const f = useFake({ notes: { data: [row] } });
    expect(await listNotes({ scriptId: 's1' })).toEqual([row]);
    expect(f.calls.some((c) => c.method === 'eq' && c.args[0] === 'script_id')).toBe(true);
    await listNotes({ projectId: 'p1' });
    expect(f.calls.some((c) => c.method === 'is' && c.args[0] === 'script_id')).toBe(true);
  });
  it('a script list also holds the project\'s own notes', async () => {
    const f = useFake({ notes: { data: [] } });
    await listNotes({ scriptId: 's1', projectId: 'p1' });
    expect(f.calls.find((c) => c.method === 'or')?.args[0]).toMatch(/script_id\.eq\.s1.*project_id\.eq\.p1.*script_id\.is\.null/);
  });
  it('throws what the database said', async () => {
    useFake({ notes: { error: { message: 'no' } } });
    await expect(listNotes({ projectId: 'p' })).rejects.toMatchObject({ message: 'no' });
  });
});

describe('addNote', () => {
  it('a project note goes to the project only; a writer note to the script only; the text is trimmed', async () => {
    const f = useFake({ notes: { data: row } });
    await addNote({ scope: 'project', body: ' hello ', projectId: 'p1', scriptId: 's1' });
    await addNote({ scope: 'writer', body: 'x', projectId: 'p1', scriptId: 's1' });
    const [a, b] = f.argsOf('notes', 'insert').map((x) => x[0] as Record<string, unknown>);
    expect(a).toMatchObject({ scope: 'project', body: 'hello', project_id: 'p1', script_id: null });
    expect(b).toMatchObject({ scope: 'writer', project_id: null, script_id: 's1' });
  });
  it('refuses an empty note without calling the database', async () => {
    const f = useFake();
    await expect(addNote({ scope: 'private', body: ' ' })).rejects.toThrow(/something/);
    expect(f.calls).toEqual([]);
  });
});

describe('editNote / deleteNote', () => {
  it('say so when nothing changed (not the author)', async () => {
    useFake({ notes: { data: [] } });
    await expect(editNote('n1', 'x')).rejects.toThrow(/author/);
    await expect(deleteNote('n1')).rejects.toThrow(/cannot delete/);
  });
  it('succeed when a row changed', async () => {
    useFake({ notes: { data: [{ id: 'n1' }] } });
    await expect(editNote('n1', 'x')).resolves.toBeUndefined();
    await expect(deleteNote('n1')).resolves.toBeUndefined();
  });
});
