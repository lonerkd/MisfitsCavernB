// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const toast = vi.fn();
const print = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/lib/print/print', () => ({ printDocument: (...a: unknown[]) => print(...a) }));
import { PrintOneSheetButton } from './PrintOneSheetButton';

const data = { page: 'public', profile: { username: 'maya k', role: 'Director', location: null, bio: null, avatar_url: null, status: null }, pieces: [], credits: [], verified_laurels: [] } as never;
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('PrintOneSheetButton', () => {
  it('prints the one-sheet with the live page address, encoded', () => {
    print.mockReturnValue(true);
    render(<PrintOneSheetButton data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /one-sheet/i }));
    expect(print).toHaveBeenCalledTimes(1);
    const doc = print.mock.calls[0][0] as { title: string; footer: string };
    expect(doc.title).toBe('maya k');
    expect(doc.footer).toMatch(/\/u\/maya%20k$/);
    expect(toast).not.toHaveBeenCalled();
  });
  it('says so when the print dialog cannot open', () => {
    print.mockReturnValue(false);
    render(<PrintOneSheetButton data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /one-sheet/i }));
    expect(toast).toHaveBeenCalledWith('Could not open the print dialog.', 'error');
  });
});
