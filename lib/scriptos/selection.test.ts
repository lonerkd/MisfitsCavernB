import { describe, expect, it } from 'vitest';
import { applySelectionAction } from './selection';

const SRC = 'INT. KITCHEN - DAY\n\nMaya waits.\n\nLEO\nHello there.\n';

describe('case on a selection', () => {
  it('uppercases the selected words and keeps them selected', () => {
    const start = SRC.indexOf('waits');
    const out = applySelectionAction(SRC, start, start + 5, 'upper')!;
    expect(out.next).toContain('Maya WAITS.');
    expect(out.next.slice(out.start, out.end)).toBe('WAITS');
  });

  it('lowercases a cue that was shouted', () => {
    const start = SRC.indexOf('LEO');
    const out = applySelectionAction(SRC, start, start + 3, 'lower')!;
    expect(out.next.slice(out.start, out.end)).toBe('leo');
    expect(out.next.startsWith('INT. KITCHEN - DAY')).toBe(true);
  });

  it('does nothing to a selection with no letters to change', () => {
    const start = SRC.indexOf('\n\n');
    const out = applySelectionAction(SRC, start, start + 2, 'upper')!;
    expect(out.next).toBe(SRC);
    expect([out.start, out.end]).toEqual([start, start + 2]);
  });

  it('needs a selection', () => {
    expect(applySelectionAction(SRC, 4, 4, 'upper')).toBeNull();
    expect(applySelectionAction(SRC, 9, 4, 'lower')).toBeNull();
  });
});

describe('duplicate the line', () => {
  it('copies the caret’s line right after it, with the caret on the copy', () => {
    const at = SRC.indexOf('Maya waits.') + 3;
    const out = applySelectionAction(SRC, at, at, 'duplicate-line')!;
    expect(out.next).toBe('INT. KITCHEN - DAY\n\nMaya waits.\nMaya waits.\n\nLEO\nHello there.\n');
    expect(out.next.slice(out.start, out.end)).toBe('Maya waits.');
  });

  it('copies a whole multi-line selection once, in order', () => {
    const start = SRC.indexOf('Maya waits.');
    const end = SRC.indexOf('Hello there.') + 'Hello there.'.length;
    const out = applySelectionAction(SRC, start, end, 'duplicate-line')!;
    const block = SRC.slice(start, end);
    expect(out.next).toBe(`${SRC.slice(0, end)}\n${block}${SRC.slice(end)}`);
    expect(out.next.slice(out.start, out.end)).toBe(block);
  });

  it('works on a last line with no trailing newline, and at the very start', () => {
    const noTrailing = 'INT. ROOM - DAY\n\nA chair.';
    const at = noTrailing.length;
    const out = applySelectionAction(noTrailing, at, at, 'duplicate-line')!;
    expect(out.next).toBe('INT. ROOM - DAY\n\nA chair.\nA chair.');
    const first = applySelectionAction(noTrailing, 0, 0, 'duplicate-line')!;
    expect(first.next).toBe('INT. ROOM - DAY\nINT. ROOM - DAY\n\nA chair.');
  });
});
