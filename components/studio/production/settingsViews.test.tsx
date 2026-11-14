// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const toast = vi.fn();
const confirm = vi.fn();
const upsert = vi.fn();
const del = vi.fn();
let store: Record<string, unknown[]> = {};
// What the signed-in person's role lets them do on the project; the owner holds all of it.
let held: string[] | 'all' = 'all';

vi.mock('@/lib/roles/capabilities', () => ({ useMyCapabilities: () => ({ loading: false, can: (c: string) => held === 'all' || held.includes(c) }) }));
vi.mock('../StudioContext', () => ({ useStudio: () => ({ project: { id: 'p1', settings: null } }) }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/ui/Confirm', () => ({ useConfirm: () => confirm }));
// The views read the project's scenes and characters through Realtime-backed hooks; no test here opens a real socket.
vi.mock('@/lib/studio', () => ({
  useProjectScenes: () => ({ rows: [] }),
  useCharacters: () => ({ rows: [] }),
}));
vi.mock('@/lib/supabase/productionRecords', () => ({
  listRecords: async (_p: string, kind: string) => store[kind] ?? [],
  upsertRecords: (...a: unknown[]) => upsert(...a),
  deleteRecords: (...a: unknown[]) => del(...a),
  subscribeToRecords: () => () => {},
}));

import { CameraReportView } from './CameraReportView';
import { CommsView } from './CommsView';
import { CostumeView } from './CostumeView';
import { DirectorNotebookView } from './DirectorNotebookView';
import { GearView } from './GearView';
import { MakeupView } from './MakeupView';
import { MediaOffloadView } from './MediaOffloadView';
import { PermitView } from './PermitView';
import { PoView } from './PoView';
import { RehearsalView } from './RehearsalView';
import { RiskRegisterView } from './RiskRegisterView';
import { ScoutView } from './ScoutView';
import { ScriptSupView } from './ScriptSupView';
import { SoundReportView } from './SoundReportView';
import { EditorialView } from './EditorialView';
import { ClaimsView } from './ClaimsView';
import { ExtrasView } from './ExtrasView';
import { StillsView } from './StillsView';
import { VfxView } from './VfxView';
import { WrapView } from './WrapView';

beforeEach(() => { store = {}; held = 'all'; upsert.mockResolvedValue(undefined); del.mockResolvedValue(undefined); confirm.mockResolvedValue(true); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const VIEWS: Array<[string, React.ComponentType]> = [
  ['Camera reports', CameraReportView], ['Comms', CommsView], ['Costumes', CostumeView], ["Director's notebook", DirectorNotebookView],
  ['Gear', GearView], ['Makeup', MakeupView], ['Media offload', MediaOffloadView], ['Stills log', StillsView], ['Extras', ExtrasView], ['Editorial handoff', EditorialView], ['Insurance claims', ClaimsView], ['Permits', PermitView], ['Purchase orders', PoView],
  ['Rehearsals', RehearsalView], ['Risk register', RiskRegisterView], ['Scouting', ScoutView], ['Script supervisor', ScriptSupView],
  ['Sound reports', SoundReportView], ['VFX', VfxView], ['Wrap', WrapView],
];

describe('the settings-backed production views', () => {
  // The audit's first finding: on a new project 17 of these showed "nothing here" INSTEAD of the form, so the first record could never be added.
  it.each(VIEWS)('%s offers its Add form on a project with no records', (_name, View) => {
    render(<View />);
    // The views name their button for the job: Add, Log, Log wrap, Schedule.
    expect(screen.getAllByRole('button', { name: /^(add|log|schedule)/i }).length).toBeGreaterThan(0);
  });

  // The shared tool header (slice 3 of the project-in-two-panes plan): every view opens with its group, its name and what it is for.
  it.each(VIEWS)('%s opens with the shared tool header: a title and a line saying what it is for', (_name, View) => {
    const { container } = render(<View />);
    const header = container.querySelector('header');
    expect(header, 'a header element').not.toBeNull();
    expect(header!.querySelector('h3')?.textContent?.trim().length ?? 0).toBeGreaterThan(2);
    expect((header!.querySelectorAll('p')[0]?.textContent ?? '').length).toBeGreaterThan(15);
  });

  it.each(VIEWS)('%s renders for a project with no records (not a crash)', (_name, View) => {
    expect(() => render(<View />)).not.toThrow();
  });
});

describe('adding a record', () => {
  it('saves it under the view\'s key, then clears the form', async () => {
    render(<MakeupView />);
    const field = screen.getByLabelText('Character') as HTMLInputElement;
    fireEvent.change(field, { target: { value: 'MAYA' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));
    expect(upsert.mock.calls[0][0]).toBe('p1');
    expect(upsert.mock.calls[0][1]).toBe('makeup');
    expect(upsert.mock.calls[0][2]).toEqual([expect.objectContaining({ character: 'MAYA' })]);
    await waitFor(() => expect(field.value).toBe(''));
  });

  // The audit's fourth finding: a refused save (a crew member is never the owner) did nothing and said nothing.
  it('a refused save says so, and keeps what the person typed', async () => {
    upsert.mockRejectedValue(new Error('new row violates row-level security policy'));
    render(<PermitView />);
    const field = screen.getByLabelText('Location') as HTMLInputElement;
    fireEvent.change(field, { target: { value: 'Pier 9' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringMatching(/only the owner and crew/), 'error'));
    expect(field.value).toBe('Pier 9');
  });

  it('deleting asks first, and "no" keeps the record', async () => {
    store = { makeup: [{ id: 'mk-1', character: 'MAYA', scene: '', look: '', artist: '', notes: '', photo: '' }] };
    confirm.mockResolvedValueOnce(false);
    render(<MakeupView />);
    fireEvent.click(await screen.findByTitle('Delete'));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(del).not.toHaveBeenCalled();
  });
});

describe('links in a record', () => {
  it('a reference that is not an http(s) address is shown as text, never as a link', async () => {
    store = { directorNotes: [
      { id: 'a', scene: '1', title: 'Safe', notes: '', reference: 'https://example.com/ref', createdAt: '2026-11-07T10:00:00Z' },
      { id: 'b', scene: '2', title: 'Unsafe', notes: '', reference: 'javascript:alert(1)', createdAt: '2026-11-07T11:00:00Z' },
    ] };
    render(<DirectorNotebookView />);
    expect((await screen.findByText('https://example.com/ref')).closest('a')?.getAttribute('href')).toBe('https://example.com/ref');
    expect(screen.getByText('javascript:alert(1)').closest('a')).toBeNull();
  });
});

describe('purchase orders and insurance claims follow the budget', () => {
  const po = { id: 'po-1', poNumber: 'PO-9', vendor: 'Lens House', department: 'Camera', amount: '100', status: 'draft' };
  const claim = { id: 'cl-1', incident: 'Camera dropped', date: '', policy: '', amount: '2400', status: 'filed', notes: '' };

  it.each([
    ['Purchase orders', PoView, 'purchaseOrders', po, 'Lens House'],
    ['Insurance claims', ClaimsView, 'claims', claim, 'Camera dropped'],
  ] as const)('%s: no budget says who holds it and shows no form', async (name, View, kind, record) => {
    held = [];
    store = { [kind]: [record] };
    render(<View />);
    expect(await screen.findByText(new RegExp(`${name} are held by the people who run the money`))).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^(add|log)/i })).toBeNull();
  });

  it.each([
    ['Purchase orders', PoView, 'purchaseOrders', po, 'Lens House'],
    ['Insurance claims', ClaimsView, 'claims', claim, 'Camera dropped'],
  ] as const)('%s: read-only shows the records, with no way to add, change or delete', async (_n, View, kind, record, text) => {
    held = ['budget.read'];
    store = { [kind]: [record] };
    render(<View />);
    expect(await screen.findByText(text)).toBeTruthy();
    expect(screen.getByText(/You can read these/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^(add|log)/i })).toBeNull();
    expect(screen.queryByTitle('Delete')).toBeNull();
    expect((screen.getByRole('combobox') as HTMLSelectElement).disabled).toBe(true);
  });

  it.each([
    ['Purchase orders', PoView, 'purchaseOrders', po, 'Lens House'],
    ['Insurance claims', ClaimsView, 'claims', claim, 'Camera dropped'],
  ] as const)('%s: running the money keeps the form and the delete button', async (_n, View, kind, record, text) => {
    held = ['budget.read', 'budget.write'];
    store = { [kind]: [record] };
    render(<View />);
    expect(await screen.findByText(text)).toBeTruthy();
    expect(screen.getByRole('button', { name: /^(add|log)/i })).toBeTruthy();
    expect(screen.getByTitle('Delete')).toBeTruthy();
    expect(screen.queryByText(/You can read these/)).toBeNull();
  });
});
