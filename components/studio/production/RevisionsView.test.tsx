// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const load = vi.fn();
let studio: Record<string, unknown> = {};
vi.mock('../StudioContext', () => ({ useStudio: () => studio }));
vi.mock('@/lib/scriptos/revisions', async (orig) => ({ ...(await orig<typeof import('@/lib/scriptos/revisions')>()), loadRevisionsDB: (...a: unknown[]) => load(...a) }));
import { RevisionsView } from './RevisionsView';

const script = { id: 's1', title: 'Pilot', updated_at: null, format: null };
beforeEach(() => { studio = { project: { title: 'P', accent_color: null }, scripts: [script], scriptId: 's1', scriptsStatus: 'ready' }; });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('RevisionsView reads the editor\'s locked revisions', () => {
  it('lists them newest first with their colour, and links to the editor', async () => {
    load.mockResolvedValue([
      { id: 'a', colorIndex: 0, date: '2026-11-01T10:00:00Z', label: 'White Revision', snapshot: '' },
      { id: 'b', colorIndex: 1, date: '2026-11-05T10:00:00Z', label: 'Blue Revision', snapshot: '' },
    ]);
    render(<RevisionsView />);
    await waitFor(() => expect(screen.getByText('Blue Revision')).toBeTruthy());
    const labels = screen.getAllByText(/Revision$/).map((e) => e.textContent);
    expect(labels).toEqual(['Blue Revision', 'White Revision']);
    expect(screen.getByRole('link', { name: /open in the editor/i }).getAttribute('href')).toBe('/editor?script=s1');
  });

  it('none locked yet says how to lock one, not "error"', async () => {
    load.mockResolvedValue([]);
    render(<RevisionsView />);
    await waitFor(() => expect(screen.getByText('No locked revisions yet')).toBeTruthy());
  });

  it('a failed read is shown as a failure, not as an empty list', async () => {
    load.mockRejectedValue(new Error('permission denied'));
    render(<RevisionsView />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('permission denied'));
    expect(screen.queryByText('No locked revisions yet')).toBeNull();
  });

  it('a project with no script says so', () => {
    studio = { project: { title: 'P', accent_color: null }, scripts: [], scriptId: null, scriptsStatus: 'ready' };
    render(<RevisionsView />);
    expect(screen.getByText('No script yet')).toBeTruthy();
    expect(load).not.toHaveBeenCalled();
  });
});
