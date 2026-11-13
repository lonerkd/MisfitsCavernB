// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const toast = vi.fn();
const print = vi.fn();
const list = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/lib/print/print', () => ({ printDocument: (...a: unknown[]) => print(...a) }));
vi.mock('@/lib/print/download', () => ({ downloadCsv: () => true }));
vi.mock('@/lib/supabase/productionRecords', () => ({ listRecords: (...a: unknown[]) => list(...a) }));
vi.mock('../StudioContext', () => ({ useStudio: () => ({ project: { id: 'p1', title: 'The Pier', accent_color: '#0f766e' } }) }));
vi.mock('./RecordLinks', () => ({ useRecordTargets: () => ({ sceneById: new Map([['s1', { id: 's1', scene_number: 12, heading: 'EXT. PIER', title: '' }]]), characterById: new Map() }) }));
import { PrintRecordsButton } from './PrintRecordsButton';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('PrintRecordsButton', () => {
  it('reads the list fresh and prints it with the linked scene number', async () => {
    list.mockResolvedValue([{ id: '1', scene_ids: ['s1'], scene: 'old', character: 'MAYA', change: 'Coat', status: 'ready' }]);
    print.mockReturnValue(true);
    render(<PrintRecordsButton kind="costumes" />);
    fireEvent.click(screen.getByRole('button', { name: /^Print \/ PDF: costumes/i }));
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    expect(list).toHaveBeenCalledWith('p1', 'costumes');
    const doc = print.mock.calls[0][0] as { title: string; kind: string; blocks: Array<{ rows: Array<Record<string, unknown>> }> };
    expect(doc).toMatchObject({ title: 'Costumes', kind: 'The Pier' });
    expect(doc.blocks[0].rows[0].scene).toBe('12');
  });
  it('says so when the list cannot be read or the print dialog cannot open', async () => {
    list.mockRejectedValueOnce(new Error('nope'));
    render(<PrintRecordsButton kind="gear" />);
    fireEvent.click(screen.getByRole('button', { name: /^Print \/ PDF: gear/i }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('nope', 'error'));
    list.mockResolvedValue([]); print.mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: /^Print \/ PDF: gear/i }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Could not open the print dialog.', 'error'));
  });
});
