// @vitest-environment jsdom
// The deliverables panel's export buttons: each hands the browser a real file with the piece's working text.
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const toast = vi.fn();
const { api } = vi.hoisted(() => ({
  api: {
    deliverables: [
      { script_id: 's1', project_id: 'p1', title: 'Radio 30', kind: 'spot_30', max_chars: null, max_seconds: 5, words_per_second: 2.5, notes: 'Keep it warm.' },
      { script_id: 's2', project_id: 'p1', title: 'Poster', kind: 'poster', max_chars: 40, max_seconds: null, words_per_second: 2.5, notes: null },
    ],
    content: { s1: '# HEADLINE\nFresh start\n\n# VO\nOne two three four five six\n', s2: '# HEADLINE\nBig sale 世界\n' } as Record<string, string>,
  },
}));

vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/studio/StudioContext', () => ({
  useStudio: () => ({ project: { id: 'p1', title: 'Spring campaign' }, isOwner: true, scripts: [{ id: 's1', title: 'Radio 30' }, { id: 's2', title: 'Poster' }] }),
}));
vi.mock('@/lib/brief', () => ({ useCanShape: () => true }));
vi.mock('@/lib/ad/api', () => ({
  listDeliverables: async () => api.deliverables,
  listBrandRules: async () => [],
  updateDeliverable: async () => null,
}));
vi.mock('@/lib/review/versions', () => ({
  listVersions: async () => [{ script_id: 's1', number: 1, status: 'sent' }],
  sendDraftsForReview: async () => ({ error: 'unused' }),
  reviewUrl: () => '',
  STATE_LABEL: { sent: 'Sent to client' },
  versionState: () => 'sent',
}));
vi.mock('@/lib/studio', () => ({ fetchScriptContent: async (id: string) => api.content[id] }));

import { DeliverablesPanel } from './DeliverablesPanel';

let saved: Array<{ name: string; text: Promise<string> }> = [];
beforeEach(() => {
  saved = [];
  toast.mockClear();
  (URL as any).createObjectURL = vi.fn((blob: Blob) => { (saved as any).lastBlob = blob; return 'blob:x'; });
  (URL as any).revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    saved.push({ name: this.download, text: ((saved as any).lastBlob as Blob).text() });
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const open = async () => { render(<DeliverablesPanel />); await screen.findByText('Radio 30'); };

describe('DeliverablesPanel — export', () => {
  it('exports one piece as a text file holding its working text, status and limits', async () => {
    await open();
    fireEvent.click(screen.getAllByRole('button', { name: 'Text' })[0]);
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0].name).toBe('spring-campaign-radio-30.txt');
    const text = await saved[0].text;
    expect(text).toContain('Radio 30');
    expect(text).toContain('Sent to client'); // the latest review version's state
    expect(text).toContain('Fresh start');
    expect(text).toContain('Spoken: 6 words, about 3 s of 5 s');
    expect(text).toContain('Keep it warm.');
  });

  it('exports the whole set in one text file, every piece, and keeps characters a PDF could not print', async () => {
    await open();
    const all = screen.getByRole('group', { name: 'Export the whole campaign' });
    fireEvent.click(all.querySelectorAll('button')[0]);
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0].name).toBe('spring-campaign.txt');
    const text = await saved[0].text;
    expect(text).toContain('2 pieces');
    expect(text).toContain('Radio 30');
    expect(text).toContain('Poster');
    expect(text).toContain('世界');
  });

  it('exports a PDF, and says when some characters could not be printed', async () => {
    await open();
    fireEvent.click(screen.getAllByRole('button', { name: 'PDF' })[1]); // the poster, which has non-Latin text
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0].name).toBe('spring-campaign-poster.pdf');
    expect((await saved[0].text).startsWith('%PDF')).toBe(true);
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('shown as “?”'), 'info');
  });

  it('tells the person when an export fails, instead of doing nothing', async () => {
    api.content.s1 = undefined as unknown as string;
    await open();
    fireEvent.click(screen.getAllByRole('button', { name: 'Text' })[0]);
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringContaining('Could not export'), 'error'));
    expect(saved).toHaveLength(0);
    api.content.s1 = '# HEADLINE\nFresh start\n\n# VO\nOne two three four five six\n';
  });
});
