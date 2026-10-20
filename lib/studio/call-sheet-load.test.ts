import { describe, it, expect } from 'vitest';
import { callSheetNotice, loadCallSheet } from './call-sheet-load';
import type { CallSheetView } from './api';

const view = (project: CallSheetView['project']): CallSheetView => ({
  sheet: { id: 's1' } as CallSheetView['sheet'],
  calls: [], project, scenes: [], people: new Map(), castAs: [], acked: null,
});

describe('loadCallSheet', () => {
  it('is ready when the sheet and its production come back', async () => {
    const v = view({ id: 'p1', title: 'Night Shift', creator_id: 'u1' });
    expect(await loadCallSheet(async () => v)).toEqual({ status: 'ready', view: v });
  });

  it('is missing when nothing comes back, or the production cannot be read', async () => {
    expect(await loadCallSheet(async () => null)).toEqual({ status: 'missing' });
    expect(await loadCallSheet(async () => view(null))).toEqual({ status: 'missing' });
  });

  it('turns a failed load into an error, without rejecting', async () => {
    const err = new Error('Could not load the call sheet');
    expect(await loadCallSheet(async () => { throw err; })).toEqual({ status: 'error', message: 'Could not load the call sheet', error: err });
    const odd = await loadCallSheet(async () => { throw 'offline'; });
    expect(odd).toMatchObject({ status: 'error', message: 'Could not load the call sheet', error: 'offline' });
  });
});

describe('callSheetNotice', () => {
  it('says nothing when the sheet loaded', () => {
    expect(callSheetNotice({ status: 'ready', view: view({ id: 'p1', title: 'T', creator_id: 'u1' }) }, 's1')).toBeNull();
  });

  it('tells the person a missing sheet is unavailable, and logs which sheet', () => {
    const n = callSheetNotice({ status: 'missing' }, 'abc-123')!;
    expect(n.toast.type).toBe('info');
    expect(n.toast.message).toMatch(/isn’t available/);
    expect(n.log.digest).toBe('call-sheet:missing');
    expect((n.log.error as Error).message).toContain('abc-123');
  });

  it('shows the failure as an error and logs the original error', () => {
    const err = new Error('Could not load the call sheet.');
    const n = callSheetNotice({ status: 'error', message: err.message, error: err }, 's1')!;
    expect(n.toast).toEqual({ message: 'Could not load the call sheet. Try again in a moment.', type: 'error' });
    expect(n.log).toEqual({ error: err, digest: 'call-sheet:load-failed' });
  });
});
