// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const toast = vi.hoisted(() => vi.fn());
const confirm = vi.hoisted(() => vi.fn());
const api = vi.hoisted(() => ({ listNotes: vi.fn(), addNote: vi.fn(), editNote: vi.fn(), deleteNote: vi.fn() }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/ui/Confirm', () => ({ useConfirm: () => confirm }));
vi.mock('@/lib/supabase/client', () => ({ supabase: { channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel: vi.fn() } }));
vi.mock('@/lib/supabase/notes', async (orig) => ({ ...(await orig<typeof import('@/lib/supabase/notes')>()), ...api }));
import { NotesPanel } from './NotesPanel';

const note = (o: Record<string, unknown>) => ({ id: 'n', scope: 'private', project_id: 'p', script_id: null, scene_id: null, context: null, body: 'b', created_by: 'me', created_at: '2026-11-07T00:00:00Z', updated_at: '2026-11-07T00:00:00Z', ...o });

beforeEach(() => { api.listNotes.mockResolvedValue([]); api.addNote.mockResolvedValue(note({})); confirm.mockResolvedValue(true); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('NotesPanel', () => {
  it('offers Writers only where a script is in view', async () => {
    const { rerender } = render(<NotesPanel projectId="p" userId="me" />);
    await screen.findByText('No notes yet.');
    expect(screen.queryByRole('button', { name: /Writers/ })).toBeNull();
    rerender(<NotesPanel projectId="p" scriptId="s" userId="me" />);
    expect(await screen.findByRole('button', { name: /Writers/ })).toBeTruthy();
  });

  it('adds a private note by default and says who reads it', async () => {
    render(<NotesPanel projectId="p" userId="me" />);
    await screen.findByText('No notes yet.');
    fireEvent.change(screen.getByLabelText('New note'), { target: { value: 'my thought' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
    await waitFor(() => expect(api.addNote).toHaveBeenCalledWith(expect.objectContaining({ scope: 'private', body: 'my thought', projectId: 'p' })));
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/only you/i), 'success');
  });

  it('a refused save tells the person and keeps the text', async () => {
    api.addNote.mockRejectedValue(new Error('nope'));
    render(<NotesPanel projectId="p" userId="me" />);
    await screen.findByText('No notes yet.');
    fireEvent.change(screen.getByLabelText('New note'), { target: { value: 'keep me' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('nope', 'error'));
    expect((screen.getByLabelText('New note') as HTMLTextAreaElement).value).toBe('keep me');
  });

  it('only the author edits; the project owner may delete a project note, nobody else\'s private/writer note', async () => {
    api.listNotes.mockResolvedValue([
      note({ id: '1', scope: 'project', created_by: 'other', body: 'theirs' }),
      note({ id: '2', scope: 'writer', created_by: 'other', body: 'writers' }),
    ]);
    render(<NotesPanel projectId="p" scriptId="s" userId="me" isProjectOwner />);
    await screen.findByText('theirs');
    expect(screen.queryByRole('button', { name: 'Edit note' })).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Delete note' })).toHaveLength(1);
  });

  it('delete asks first', async () => {
    api.listNotes.mockResolvedValue([note({ id: '1', created_by: 'me', body: 'mine' })]);
    confirm.mockResolvedValueOnce(false);
    render(<NotesPanel projectId="p" userId="me" />);
    await screen.findByText('mine');
    fireEvent.click(screen.getByRole('button', { name: 'Delete note' }));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(api.deleteNote).not.toHaveBeenCalled();
  });
});
