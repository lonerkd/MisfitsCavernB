// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const toast = vi.fn();
let rows: Array<{ id: string; portfolio_project_id: string; name: string; kind: string; year: number | null }> = [];
const add = vi.fn();
const remove = vi.fn(async () => undefined);
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/lib/supabase/portfolio', () => ({
  listLaurels: async () => rows,
  addLaurel: (...a: unknown[]) => add(...a),
  removeLaurel: (...a: unknown[]) => remove(...(a as [])),
}));
import { LaurelsEditor } from './LaurelsEditor';

afterEach(() => { cleanup(); vi.clearAllMocks(); rows = []; });

describe('LaurelsEditor', () => {
  it('shows the piece’s laurels, says they are the person’s own word, and adds one with its kind and year', async () => {
    rows = [{ id: 'l1', portfolio_project_id: 'p1', name: 'Rotterdam', kind: 'award', year: 2026 }];
    add.mockResolvedValue({ id: 'l2', portfolio_project_id: 'p1', name: 'Local Night', kind: 'screening', year: 2025 });
    render(<LaurelsEditor pieceId="p1" title="My Short" />);
    expect(await screen.findByText('Award · Rotterdam · 2026')).toBeTruthy();
    expect(screen.getByText(/shown as your own word/i)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Festival or award on My Short'), { target: { value: 'Local Night' } });
    fireEvent.change(screen.getByLabelText('Kind'), { target: { value: 'screening' } });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2025' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    await waitFor(() => expect(add).toHaveBeenCalledWith('p1', { name: 'Local Night', kind: 'screening', year: 2025 }));
    expect(await screen.findByText('Screening · Local Night · 2025')).toBeTruthy();
  });

  it('says so when a save is refused, and keeps what was typed', async () => {
    add.mockRejectedValue(new Error('A piece holds at most twelve laurels'));
    render(<LaurelsEditor pieceId="p1" title="My Short" />);
    const input = await screen.findByLabelText('Festival or award on My Short');
    fireEvent.change(input, { target: { value: 'One too many' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('A piece holds at most twelve laurels', 'error'));
    expect((input as HTMLInputElement).value).toBe('One too many');
  });

  it('removes one', async () => {
    rows = [{ id: 'l1', portfolio_project_id: 'p1', name: 'Rotterdam', kind: 'award', year: null }];
    render(<LaurelsEditor pieceId="p1" title="My Short" />);
    fireEvent.click(await screen.findByLabelText('Remove Rotterdam from My Short'));
    await waitFor(() => expect(remove).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText('Award · Rotterdam')).toBeNull());
  });
});
