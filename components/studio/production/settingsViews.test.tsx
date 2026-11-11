// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const toast = vi.fn();
const confirm = vi.fn();
const patch = vi.fn();
let settings: Record<string, unknown> | null = {};

vi.mock('../StudioContext', () => ({ useStudio: () => ({ project: { id: 'p1', settings }, scenes: { rows: [] } }) }));
vi.mock('@/lib/studio', () => ({ useCharacters: () => ({ rows: [] }) }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/ui/Confirm', () => ({ useConfirm: () => confirm }));
vi.mock('@/lib/supabase/progress', () => ({ patchProjectSettings: (...a: unknown[]) => patch(...a) }));

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
import { VfxView } from './VfxView';
import { WrapView } from './WrapView';

beforeEach(() => { settings = {}; patch.mockResolvedValue({}); confirm.mockResolvedValue(true); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const VIEWS: Array<[string, React.ComponentType]> = [
  ['Camera reports', CameraReportView], ['Comms', CommsView], ['Costumes', CostumeView], ["Director's notebook", DirectorNotebookView],
  ['Gear', GearView], ['Makeup', MakeupView], ['Media offload', MediaOffloadView], ['Permits', PermitView], ['Purchase orders', PoView],
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

  it.each(VIEWS)('%s renders for a project whose settings are null (not a crash)', (_name, View) => {
    settings = null;
    expect(() => render(<View />)).not.toThrow();
  });
});

describe('adding a record', () => {
  it('saves it under the view\'s key, then clears the form', async () => {
    render(<MakeupView />);
    const field = screen.getByLabelText('Character') as HTMLInputElement;
    fireEvent.change(field, { target: { value: 'MAYA' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patch.mock.calls[0][0]).toBe('p1');
    expect(patch.mock.calls[0][1].makeup).toEqual([expect.objectContaining({ character: 'MAYA' })]);
    await waitFor(() => expect(field.value).toBe(''));
  });

  // The audit's fourth finding: a refused save (a crew member is never the owner) did nothing and said nothing.
  it('a refused save says so, and keeps what the person typed', async () => {
    patch.mockRejectedValue(new Error('Only the project owner can change this'));
    render(<PermitView />);
    const field = screen.getByLabelText('Location') as HTMLInputElement;
    fireEvent.change(field, { target: { value: 'Pier 9' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Only the project owner can change this', 'error'));
    expect(field.value).toBe('Pier 9');
  });

  it('deleting asks first, and "no" keeps the record', async () => {
    settings = { makeup: [{ id: 'mk-1', character: 'MAYA', scene: '', look: '', artist: '', notes: '', photo: '' }] };
    confirm.mockResolvedValueOnce(false);
    render(<MakeupView />);
    fireEvent.click(screen.getByTitle('Delete'));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(patch).not.toHaveBeenCalled();
  });
});

describe('links in a record', () => {
  it('a reference that is not an http(s) address is shown as text, never as a link', () => {
    settings = { directorNotes: [
      { id: 'a', scene: '1', title: 'Safe', notes: '', reference: 'https://example.com/ref', createdAt: '2026-11-07T10:00:00Z' },
      { id: 'b', scene: '2', title: 'Unsafe', notes: '', reference: 'javascript:alert(1)', createdAt: '2026-11-07T11:00:00Z' },
    ] };
    render(<DirectorNotebookView />);
    expect(screen.getByText('https://example.com/ref').closest('a')?.getAttribute('href')).toBe('https://example.com/ref');
    expect(screen.getByText('javascript:alert(1)').closest('a')).toBeNull();
  });
});
