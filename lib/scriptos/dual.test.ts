import { describe, expect, it } from 'vitest';
import { toggleDualCaret } from './dual';

describe('toggleDualCaret', () => {
  const src = 'INT. ROOM - DAY\n\nMAYA\nHi.\n\nLEO\nHey.\n';

  it('marks the cue under the caret, and takes the mark off again', () => {
    const on = toggleDualCaret(src, src.indexOf('LEO') + 1)!;
    expect(on.added).toBe(true);
    expect(on.next).toBe('INT. ROOM - DAY\n\nMAYA\nHi.\n\n^LEO\nHey.\n');
    const off = toggleDualCaret(on.next, on.next.indexOf('LEO') + 1)!;
    expect(off.added).toBe(false);
    expect(off.next).toBe(src);
  });

  it('keeps indentation', () => {
    expect(toggleDualCaret('  MAYA\nHi.', 2)!.next).toBe('  ^MAYA\nHi.');
  });

  it('is null on anything that is not a cue', () => {
    expect(toggleDualCaret(src, 3)).toBeNull(); // a scene heading
    expect(toggleDualCaret(src, src.indexOf('Hi.'))).toBeNull(); // dialogue
    expect(toggleDualCaret('CUT TO:\n', 1)).toBeNull(); // a transition with a colon
    expect(toggleDualCaret('', 0)).toBeNull();
  });
});
