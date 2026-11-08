// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const toast = vi.fn();
const print = vi.fn();
const save = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/lib/print/print', () => ({ printDocument: (...a: unknown[]) => print(...a) }));
vi.mock('@/lib/print/download', () => ({ downloadCsv: (...a: unknown[]) => save(...a) }));
import { PrintButton } from './PrintButton';

const withTable = { title: 'T', kind: 'K', blocks: [{ type: 'table' as const, columns: [{ key: 'a', label: 'A' }], rows: [{ a: 1 }] }] };
const noTable = { title: 'T', kind: 'K', blocks: [{ type: 'text' as const, text: 'hi' }] };
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('PrintButton', () => {
  it('prints, and saves a CSV when the page has a table', () => {
    print.mockReturnValue(true); save.mockReturnValue(true);
    render(<PrintButton label="the budget" build={() => withTable} />);
    fireEvent.click(screen.getByRole('button', { name: /print the budget/i }));
    fireEvent.click(screen.getByRole('button', { name: /spreadsheet/i }));
    expect(print).toHaveBeenCalledWith(withTable);
    expect(save).toHaveBeenCalledWith(withTable);
    expect(toast).not.toHaveBeenCalled();
  });
  it('says so when there is no table to save, when saving or printing fails, and when the page cannot be built', () => {
    render(<PrintButton label="x" build={() => noTable} />);
    fireEvent.click(screen.getByRole('button', { name: /spreadsheet/i }));
    expect(toast).toHaveBeenCalledWith('There is nothing in a table to save yet.', 'info');
    cleanup(); toast.mockClear();
    save.mockReturnValue(false); print.mockReturnValue(false);
    render(<PrintButton label="x" build={() => withTable} />);
    fireEvent.click(screen.getByRole('button', { name: /spreadsheet/i }));
    fireEvent.click(screen.getByRole('button', { name: /print x/i }));
    expect(toast).toHaveBeenCalledWith('Could not save the file.', 'error');
    expect(toast).toHaveBeenCalledWith('Could not open the print dialog.', 'error');
    cleanup(); toast.mockClear();
    render(<PrintButton label="x" build={() => { throw new Error('nope'); }} />);
    fireEvent.click(screen.getByRole('button', { name: /spreadsheet/i }));
    expect(toast).toHaveBeenCalledWith('nope', 'error');
  });
  it('can leave the CSV button out', () => {
    render(<PrintButton label="x" csv={false} build={() => withTable} />);
    expect(screen.queryByRole('button', { name: /spreadsheet/i })).toBeNull();
  });
});
