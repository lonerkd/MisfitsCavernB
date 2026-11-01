// @vitest-environment jsdom
// The deliverables panel's export buttons: each hands the browser a real file with the piece's working text.
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const toast = vi.fn();
const { api } = vi.hoisted(() => ({
  api: {
    versions: [{ script_id: 's1', number: 1, status: 'sent' }] as Array<{ script_id: string; number: number; status: string }>,
    versionCalls: 0,
    versionsFail: false,
    local: {} as Record<string, string>,
    title: 'Spring campaign',
    deliverables: [
      { script_id: 's1', project_id: 'p1', title: 'Radio 30', kind: 'spot_30', max_chars: null, max_seconds: 5, words_per_second: 2.5, notes: 'Keep it warm.' },
      { script_id: 's2', project_id: 'p1', title: 'Poster', kind: 'poster', max_chars: 40, max_seconds: null, words_per_second: 2.5, notes: null },
    ],
    content: { s1: '# HEADLINE\nFresh start\n\n# VO\nOne two three four five six\n', s2: '# HEADLINE\nBig sale 世界\n' } as Record<string, string>,
  },
}));

vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/studio/StudioContext', () => ({
  useStudio: () => ({ project: { id: 'p1', get title() { return api.title; } }, isOwner: true, scripts: [{ id: 's1', title: 'Radio 30' }, { id: 's2', title: 'Poster' }] }),
}));
vi.mock('@/lib/brief', () => ({ useCanShape: () => true }));
vi.mock('@/lib/ad/api', () => ({
  listDeliverables: async () => api.deliverables,
  listBrandRules: async () => [],
  updateDeliverable: async () => null,
}));
vi.mock('@/lib/review/versions', () => ({
  listVersions: async () => { api.versionCalls++; if (api.versionsFail && api.versionCalls > 1) throw new Error('versions unreachable'); return api.versions; },
  sendDraftsForReview: async () => ({ error: 'unused' }),
  reviewUrl: () => '',
  STATE_LABEL: { sent: 'Sent to client' },
  versionState: () => 'sent',
}));
vi.mock('@/lib/studio', () => ({ fetchScriptContent: async (id: string) => api.content[id] }));
vi.mock('@/lib/scriptos/storage', () => ({ getScript: async (id: string) => (id in api.local ? { id, content: api.local[id] } : null) }));

import { DeliverablesPanel } from './DeliverablesPanel';

let saved: Array<{ name: string; text: Promise<string> }> = [];
beforeEach(() => {
  saved = [];
  toast.mockClear();
  api.versions = [{ script_id: 's1', number: 1, status: 'sent' }];
  api.versionCalls = 0;
  api.versionsFail = false;
  api.local = {};
  api.title = 'Spring campaign';
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

  it('exports the newest review status read at export time, not the panel\'s earlier list', async () => {
    await open();
    api.versions = [{ script_id: 's1', number: 1, status: 'sent' }, { script_id: 's1', number: 2, status: 'draft' }];
    fireEvent.click(screen.getAllByRole('button', { name: 'Text' })[0]);
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(api.versionCalls).toBeGreaterThan(1);
  });

  it('says so, and exports nothing, when the review status cannot be read (it does not quietly print "Draft")', async () => {
    await open();
    api.versionsFail = true;
    fireEvent.click(screen.getAllByRole('button', { name: 'Text' })[0]);
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringContaining('versions unreachable'), 'error'));
    expect(saved).toHaveLength(0);
  });

  it('exports the device\'s copy when it holds newer text than the server', async () => {
    api.local = { s1: '# HEADLINE\nWritten offline, not yet synced\n' };
    await open();
    fireEvent.click(screen.getAllByRole('button', { name: 'Text' })[0]);
    await waitFor(() => expect(saved).toHaveLength(1));
    const text = await saved[0].text;
    expect(text).toContain('Written offline, not yet synced');
    expect(text).not.toContain('Fresh start');
  });

  it('tells the person about unprintable characters in the campaign name too', async () => {
    api.title = '世界 campaign';
    await open();
    fireEvent.click(screen.getAllByRole('button', { name: 'PDF' })[0]); // the radio piece itself is plain Latin text
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('shown as “?”'), 'info');
  });
});
