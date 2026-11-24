// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const toast = vi.hoisted(() => vi.fn());
const confirm = vi.hoisted(() => vi.fn());
const api = vi.hoisted(() => ({ listTasks: vi.fn(), addTask: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn() }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/ui/Confirm', () => ({ useConfirm: () => confirm }));
vi.mock('@/lib/supabase/project-hub', () => api);
import { NotesChecklist } from './NotesChecklist';

const task = (id: string, title: string, completed = false) => ({ id, title, completed, assigned_to: null, due_date: null });

beforeEach(() => { api.listTasks.mockResolvedValue([task('1', 'Book the venue'), task('2', 'Email Sam', true)]); confirm.mockResolvedValue(true); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('NotesChecklist', () => {
  it('shows the project’s tasks with how many are done', async () => {
    render(<NotesChecklist projectId="p1" />);
    expect(await screen.findByText('Book the venue')).toBeTruthy();
    expect(screen.getByText(/Checklist · 1 of 2/)).toBeTruthy();
    expect(api.listTasks).toHaveBeenCalledWith('p1');
  });

  it('adds an item (saved first, then shown) and clears the field', async () => {
    api.addTask.mockResolvedValue(task('3', 'Pack the van'));
    render(<NotesChecklist projectId="p1" />);
    await screen.findByText('Book the venue');
    const field = screen.getByLabelText('New checklist item');
    fireEvent.change(field, { target: { value: 'Pack the van' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(await screen.findByText('Pack the van')).toBeTruthy();
    expect(api.addTask).toHaveBeenCalledWith('p1', 'Pack the van');
    expect((field as HTMLInputElement).value).toBe('');
  });

  it('a failed add says so and keeps the text', async () => {
    api.addTask.mockRejectedValue(new Error('permission denied'));
    render(<NotesChecklist projectId="p1" />);
    await screen.findByText('Book the venue');
    const field = screen.getByLabelText('New checklist item');
    fireEvent.change(field, { target: { value: 'Pack the van' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    await waitFor(() => expect(toast).toHaveBeenCalledWith('permission denied', 'error'));
    expect((field as HTMLInputElement).value).toBe('Pack the van');
    expect(screen.queryByText('Pack the van')).toBeNull();
  });

  it('ticking saves, and a failed save does not tick', async () => {
    api.updateTask.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('nope'));
    render(<NotesChecklist projectId="p1" />);
    await screen.findByText('Book the venue');
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    fireEvent.click(boxes[0]);
    await waitFor(() => expect(screen.getByText(/2 of 2/)).toBeTruthy());
    expect(api.updateTask).toHaveBeenCalledWith('1', { completed: true });
    fireEvent.click(boxes[1]);
    await waitFor(() => expect(toast).toHaveBeenCalledWith('nope', 'error'));
    expect(screen.getByText(/2 of 2/)).toBeTruthy();
  });

  it('deleting asks first, and only a confirmed delete removes it', async () => {
    api.deleteTask.mockResolvedValue(undefined);
    confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<NotesChecklist projectId="p1" />);
    await screen.findByText('Book the venue');
    fireEvent.click(screen.getByLabelText('Delete Book the venue'));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(api.deleteTask).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Delete Book the venue'));
    await waitFor(() => expect(screen.queryByText('Book the venue')).toBeNull());
    expect(api.deleteTask).toHaveBeenCalledWith('1');
  });
});
