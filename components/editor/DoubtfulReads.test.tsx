// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import type { Doubt } from '@/lib/scriptos/review';

const toast = vi.fn();
const setLineOverride = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/lib/studio', () => ({ studio: { setLineOverride: (...a: unknown[]) => setLineOverride(...a), setReadingCorrection: vi.fn() } }));
import { DoubtfulReads } from './DoubtfulReads';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const action: Doubt = { index: 4, text: 'She waits by the door', type: 'dialogue', confidence: 55, alternative: 'action', name: null, why: 'Read as dialogue; could be action' };

describe('DoubtfulReads: settle a doubtful line in one tap', () => {
  it('"Read as action" forces the line in this script, tells the editor and hides the doubt', async () => {
    setLineOverride.mockResolvedValue(undefined);
    const overridden = vi.fn();
    render(<DoubtfulReads doubts={[action]} projectId="p1" scriptId="s1" onSaved={vi.fn()} onOverridden={overridden} />);
    fireEvent.click(screen.getByRole('button', { name: /Read as action/ }));
    await waitFor(() => expect(setLineOverride).toHaveBeenCalledWith('p1', 's1', 4, 'action', 'She waits by the door'));
    await waitFor(() => expect(overridden).toHaveBeenCalled());
    expect(screen.queryByText(/She waits by the door/)).toBeNull();
    expect(toast).toHaveBeenCalledWith('Line 5 is read as action', 'success');
  });

  it('says so when it cannot save, and keeps the doubt', async () => {
    setLineOverride.mockRejectedValue(new Error('nope'));
    render(<DoubtfulReads doubts={[action]} projectId="p1" scriptId="s1" onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Read as action/ }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('nope', 'error'));
    expect(screen.getByText(/She waits by the door/)).toBeTruthy();
  });

  it('offers no button without a script, and none for a name that has its project-wide verdict', () => {
    const { rerender } = render(<DoubtfulReads doubts={[action]} projectId="p1" scriptId={null} onSaved={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Read as/ })).toBeNull();
    rerender(<DoubtfulReads doubts={[{ ...action, type: 'action', alternative: 'character', name: 'MAYA' }]} projectId="p1" scriptId="s1" onSaved={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Read as character/ })).toBeNull();
    expect(screen.getByRole('button', { name: /It’s a character/ })).toBeTruthy();
  });
});
