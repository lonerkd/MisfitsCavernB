import { describe, it, expect } from 'vitest';
import { extendSelection } from './selection';

const script = 'FADE IN:\n\nINT. HOUSE - DAY\n\nMAYA\nHello.\n\nCUT TO:\n\nEXT. STREET - DAY';

describe('extendSelection (Caps Lock arrows)', () => {
  it('extends right one character from a caret', () => {
    const r = extendSelection({ value: script, selection: { start: 0, end: 0 }, key: 'ArrowRight' });
    expect(r.next).toEqual({ start: 0, end: 1 });
    expect(r.caret).toBe(1);
  });

  it('extends left one character, keeping the anchor at the end', () => {
    const r = extendSelection({ value: script, selection: { start: 10, end: 10 }, key: 'ArrowLeft' });
    expect(r.next).toEqual({ start: 9, end: 10 });
    expect(r.caret).toBe(9);
  });

  it('grows an existing selection to the right without moving the anchor', () => {
    const r = extendSelection({ value: script, selection: { start: 9, end: 12 }, key: 'ArrowRight' });
    expect(r.next).toEqual({ start: 9, end: 13 });
  });

  it('grows an existing selection to the left without moving the anchor', () => {
    const r = extendSelection({ value: script, selection: { start: 9, end: 12 }, key: 'ArrowLeft' });
    expect(r.next).toEqual({ start: 8, end: 12 });
  });

  it('stops at the ends of the script', () => {
    expect(extendSelection({ value: script, selection: { start: 0, end: 0 }, key: 'ArrowLeft' }).next).toEqual({ start: 0, end: 0 });
    expect(extendSelection({ value: script, selection: { start: script.length, end: script.length }, key: 'ArrowRight' }).next).toEqual({ start: script.length, end: script.length });
  });

  it('moves up a line, keeping the column', () => {
    // Caret at the 'H' of "Hello." (line 6, col 0 → the line starts after the \n)
    const at = script.indexOf('Hello.');
    const r = extendSelection({ value: script, selection: { start: at, end: at }, key: 'ArrowUp' });
    // The line above is "MAYA" — same column 0.
    expect(r.next.start).toBe(script.indexOf('MAYA'));
    expect(r.next.end).toBe(at);
  });

  it('moves down a line from the anchor, extending the selection', () => {
    const at = script.indexOf('MAYA');
    const r = extendSelection({ value: script, selection: { start: at, end: at }, key: 'ArrowDown' });
    // Down to "Hello." — the selection spans from MAYA to there.
    expect(r.next.start).toBe(at);
    expect(r.next.end).toBe(script.indexOf('Hello.'));
  });

  it('anchors a caret so the first arrow starts a highlight', () => {
    const at = script.indexOf('Hello.') + 2;
    const r = extendSelection({ value: script, selection: { start: at, end: at }, key: 'ArrowRight' });
    expect(r.next).toEqual({ start: at, end: at + 1 });
  });
});
