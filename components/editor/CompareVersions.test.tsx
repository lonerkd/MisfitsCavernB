// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CompareVersions } from './CompareVersions';
import type { Revision } from '@/lib/scriptos/revisions';

afterEach(cleanup);

const V1 = 'Title: Brick & Steel\n\nINT. KITCHEN - DAY\n\nMAYA\nHi there.\n\nEXT. STREET - NIGHT\n\nLEO\nHey.\n';
const V2 = 'Title: Brick & Steel\n\nINT. KITCHEN - DAY\n\nMAYA\nHi there, again.\n\nEXT. STREET - NIGHT\n\nLEO\nHey.\n\nINT. HALL - DAY\n\nMaya waits.\n';

const rev = (id: string, label: string, date: string, snapshot: string): Revision => ({ id, label, date, snapshot, colorIndex: 0 });

function open(revisions: Revision[], draft: string) {
  render(<CompareVersions isOpen onClose={() => {}} revisions={revisions} draft={draft} />);
}

describe('Compare versions', () => {
  it('lists only the scenes that moved, newest revision against the draft', () => {
    open([rev('r1', 'First draft', '2026-10-01T10:00:00Z', V1)], V2);
    expect(screen.getByRole('dialog', { name: 'Compare script versions' })).toBeTruthy();
    expect(screen.getByText('INT. KITCHEN - DAY')).toBeTruthy(); // changed
    expect(screen.getByText('INT. HALL - DAY')).toBeTruthy(); // added
    expect(screen.queryByText('EXT. STREET - NIGHT')).toBeNull(); // unchanged, hidden
  });

  it('opens a scene to show the lines that went in and came out', () => {
    open([rev('r1', 'First draft', '2026-10-01T10:00:00Z', V1)], V2);
    fireEvent.click(screen.getByText('INT. KITCHEN - DAY'));
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('Hi there, again.');
    expect(dialog.textContent).toContain('Hi there.');
  });

  it('says so when the two versions are the same', () => {
    open([rev('r1', 'First draft', '2026-10-01T10:00:00Z', V1)], V1);
    expect(screen.getByText(/No changes between/)).toBeTruthy();
  });

  it('shows every scene when asked, and compares two revisions', () => {
    open([
      rev('r1', 'First draft', '2026-10-01T10:00:00Z', V1),
      rev('r2', 'Second draft', '2026-10-02T10:00:00Z', V2),
    ], V2);
    fireEvent.change(screen.getByRole('combobox', { name: 'Compare from' }), { target: { value: 'r1' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Compare to' }), { target: { value: 'r2' } });
    expect(screen.queryByText('EXT. STREET - NIGHT')).toBeNull(); // still only what changed
    fireEvent.click(screen.getByRole('button', { name: 'Show every scene' }));
    expect(screen.getByText('EXT. STREET - NIGHT')).toBeTruthy();
    expect(screen.getAllByText('INT. HALL - DAY').length).toBeGreaterThan(0);
  });
});
