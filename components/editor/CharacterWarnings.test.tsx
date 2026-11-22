// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { parseScript } from '@/lib/scriptos/parser';
import { CharacterWarnings } from './CharacterWarnings';

afterEach(() => { cleanup(); localStorage.clear(); });

const TEXT = `INT. A - DAY

MAYA
Hi.

LUIS
Hi.

MAYA
Bye.

LUIS
Bye.

INT. B - DAY

MAYAH
Oh.

LUIS
Hm.
`;
const r = parseScript(TEXT);

describe('CharacterWarnings', () => {
  it('lists the warnings, jumps to a line and keeps a dismissal on this device', () => {
    const jump = vi.fn();
    const { unmount } = render(<CharacterWarnings lines={r.lines} scenes={r.scenes} rejectedNames={[]} storageKey="s1" onJump={jump} />);
    const spelling = screen.getAllByTestId('character-warning').find((e) => e.getAttribute('data-rule') === 'spelling')!;
    expect(spelling.textContent).toMatch(/MAYAH and MAYA/);
    fireEvent.click(screen.getAllByRole('button', { name: /Go to line/ })[0]);
    expect(jump).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /It is on purpose: MAYAH and MAYA/ }));
    expect(screen.getAllByTestId('character-warning').some((e) => e.getAttribute('data-rule') === 'spelling' && !e.closest('details'))).toBe(false);
    unmount();
    render(<CharacterWarnings lines={r.lines} scenes={r.scenes} rejectedNames={[]} storageKey="s1" onJump={jump} />);
    expect(screen.getByText(/Dismissed · /)).toBeTruthy();
  });

  it('obeys the rejected names', () => {
    render(<CharacterWarnings lines={r.lines} scenes={r.scenes} rejectedNames={['MAYAH']} storageKey="s2" onJump={() => {}} />);
    expect(screen.queryByText(/MAYAH and MAYA/)).toBeNull();
  });
});
