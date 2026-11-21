// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { CompareVersions } from './CompareVersions';
import type { Revision } from '@/lib/scriptos/revisions';

afterEach(cleanup);

beforeAll(() => {
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null })) as unknown as typeof window.matchMedia;
  Element.prototype.scrollIntoView = () => {};
});

const V1 = 'Title: Brick & Steel\n\nINT. KITCHEN - DAY\n\nMAYA\nHi there.\n\nEXT. STREET - NIGHT\n\nLEO\nHey.\n';
const V2 = 'Title: Brick & Steel\n\nINT. KITCHEN - DAY\n\nMAYA\nHi there, again.\n\nEXT. STREET - NIGHT\n\nLEO\nHey.\n\nINT. HALL - DAY\n\nMaya waits.\n';

const rev = (id: string, label: string, date: string, snapshot: string): Revision => ({ id, label, date, snapshot, colorIndex: 0 });

function open(revisions: Revision[], draft: string, extra: Partial<React.ComponentProps<typeof CompareVersions>> = {}) {
  render(<CompareVersions isOpen onClose={() => {}} revisions={revisions} draft={draft} {...extra} />);
}

describe('Compare versions', () => {
  it('opens on the newest revision against the draft, with the numbers and only the scenes that changed', () => {
    open([rev('r1', 'First draft', '2026-10-01T10:00:00Z', V1)], V2);
    expect(screen.getByRole('dialog', { name: 'Compare script versions' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /INT\. KITCHEN - DAY/ })).toBeTruthy(); // changed
    expect(screen.getByRole('button', { name: /INT\. HALL - DAY/ })).toBeTruthy(); // added
    expect(screen.queryByText('EXT. STREET - NIGHT')).toBeNull(); // unchanged, folded
    expect(screen.getByText(/1 unchanged scene/)).toBeTruthy();
    expect(screen.getByText('Scenes added').nextElementSibling?.textContent).toContain('1');
    expect(screen.getByText('Dialogue changed').nextElementSibling?.textContent).toContain('1');
  });

  it('marks a changed line with + and − as well as colour, and shows both versions', () => {
    open([rev('r1', 'First draft', '2026-10-01T10:00:00Z', V1)], V2);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByText('−').length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText('+').length).toBeGreaterThan(0);
    expect(dialog.textContent).toContain('again');
  });

  it('folds long runs of unchanged lines and opens them on request', () => {
    const long = Array.from({ length: 14 }, (_, i) => `Line ${i} of a long action block.`).join('\n');
    open([rev('r1', 'A', '2026-10-01T10:00:00Z', `INT. A - DAY\n\n${long}\n`)], `INT. A - DAY\n\n${long.replace('Line 7', 'Line seven')}\n`);
    const folds = () => screen.queryAllByRole('button', { name: /unchanged lines? — show/ });
    const before = folds().length;
    expect(before).toBe(2);
    fireEvent.click(folds()[0]);
    expect(folds().length).toBe(before - 1);
  });

  it('filters by kind of line', () => {
    const a = 'INT. A - DAY\n\nRain falls.\n\nMAYA\nGo.\n';
    const b = 'INT. A - DAY\n\nSnow falls.\n\nMAYA\nStay.\n';
    open([rev('r1', 'A', '2026-10-01T10:00:00Z', a)], b);
    expect(screen.getByText('2 changes')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Dialogue' }));
    expect(screen.getByText('1 change')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Scene headings' }));
    expect(screen.getByText('No changes')).toBeTruthy();
    expect(screen.getByText('Nothing differs under this filter.')).toBeTruthy();
  });

  it('next and previous move through the changes, say where they are, and focus the change; N and P do the same', () => {
    open([rev('r1', 'First draft', '2026-10-01T10:00:00Z', V1)], V2);
    const status = () => screen.getAllByRole('status').map((n) => n.textContent).join('|');
    fireEvent.click(screen.getByRole('button', { name: 'Next change' }));
    expect(status()).toContain('Change 1 of 2');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'n' });
    expect(status()).toContain('Change 2 of 2');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'p' });
    expect(status()).toContain('Change 1 of 2');
    fireEvent.click(screen.getByRole('button', { name: 'Previous change' }));
    expect(status()).toContain('Change 2 of 2');
  });

  it('says so when the two versions are the same', () => {
    open([rev('r1', 'First draft', '2026-10-01T10:00:00Z', V1)], V1);
    expect(screen.getByText(/No changes between/)).toBeTruthy();
  });

  it('compares two revisions, and swaps them', () => {
    open([
      rev('r1', 'First draft', '2026-10-01T10:00:00Z', V1),
      rev('r2', 'Second draft', '2026-10-02T10:00:00Z', V2),
    ], V2);
    fireEvent.change(screen.getByRole('combobox', { name: 'Version A' }), { target: { value: 'r1' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Version B' }), { target: { value: 'r2' } });
    expect(screen.getByRole('button', { name: /INT\. HALL - DAY/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Swap A and B' }));
    expect((screen.getByRole('combobox', { name: 'Version A' }) as HTMLSelectElement).value).toBe('r2');
    expect(screen.getByText('Scenes cut').nextElementSibling?.textContent).toContain('1');
  });

  it('has a loading state and an empty state', () => {
    open([], V1, { loading: true });
    expect(screen.getByText('Reading the versions…')).toBeTruthy();
    cleanup();
    open([], V1);
    expect(screen.getByText('Only one version so far — lock a revision or save a draft to compare.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Next change' })).toBeNull();
  });

  it('offers the change report through the print kit', () => {
    open([rev('r1', 'First draft', '2026-10-01T10:00:00Z', V1)], V2);
    expect(screen.getByRole('button', { name: /Print \/ PDF: the change report/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /CSV: the change report/ })).toBeTruthy();
  });
});
