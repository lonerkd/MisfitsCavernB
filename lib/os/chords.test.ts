import { describe, expect, it } from 'vitest';
import { CHORDS, chordText, matchChord } from './chords';

const press = (key: string, o: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }> = {}) =>
  ({ key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...o });

describe('the chord table', () => {
  it('has no two chords on the same keys in one scope, and no tool chord on a global one', () => {
    const sig = (c: (typeof CHORDS)[number]) => `${c.key}${c.shift ? '+shift' : ''}`;
    for (const [i, c] of CHORDS.entries()) {
      for (const earlier of CHORDS.slice(0, i)) {
        if (sig(earlier) !== sig(c)) continue;
        // Different tools may share keys (⌘F in the editor and another tool), but never within one scope, and never with a global chord.
        expect(earlier.scope !== c.scope && earlier.scope !== 'global' && c.scope !== 'global', `${c.id} reuses the keys of ${earlier.id}`).toBe(true);
      }
    }
  });

  it('gives every chord an id nobody else has', () => {
    expect(new Set(CHORDS.map((c) => c.id)).size).toBe(CHORDS.length);
  });
});

describe('matchChord', () => {
  it('needs Ctrl or ⌘, and no Alt', () => {
    expect(matchChord(press('k'))).toBeUndefined();
    expect(matchChord(press('k', { ctrlKey: true }))?.id).toBe('palette');
    expect(matchChord(press('K', { metaKey: true }))?.id).toBe('palette');
    expect(matchChord(press('k', { ctrlKey: true, altKey: true }))).toBeUndefined();
  });

  it('finds a global chord in any scope, and a tool chord only in its own', () => {
    expect(matchChord(press('\\', { ctrlKey: true }), 'editor')?.id).toBe('split');
    expect(matchChord(press('s', { ctrlKey: true }))).toBeUndefined();
    expect(matchChord(press('s', { ctrlKey: true }), 'editor')?.id).toBe('editor.save');
    expect(matchChord(press('s', { ctrlKey: true }), 'split')).toBeUndefined();
  });

  it('tells undo from redo by Shift', () => {
    expect(matchChord(press('z', { metaKey: true }), 'editor')?.id).toBe('editor.undo');
    expect(matchChord(press('z', { metaKey: true, shiftKey: true }), 'editor')?.id).toBe('editor.redo');
  });
});

describe('chordText', () => {
  it('writes a chord for the platform', () => {
    const redo = CHORDS.find((c) => c.id === 'editor.redo')!;
    expect(chordText(redo, true)).toBe('⌘⇧Z');
    expect(chordText(redo, false)).toBe('Ctrl Shift Z');
  });
});
