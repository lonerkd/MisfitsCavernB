// Caps Lock selection: the keyboard-only way to highlight the script. Under
// Caps Lock the deck is open and the arrows are the selection keys (like
// Shift+arrows, so the whole script can be worked without a mouse — select a
// block, then a deck key acts on it). Pure text maths, tested in
// lib/scriptos/selection.test.ts.

export interface Selection {
  start: number;
  end: number;
}

export interface SelectionOptions {
  value: string;
  selection: Selection;
  key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';
}

export interface SelectionResult {
  next: Selection;
  /** The caret (the moving end), for the caller to place. */
  caret: number;
}

const lineStart = (value: string, at: number) => value.lastIndexOf('\n', at - 1) + 1;
const lineEnd = (value: string, at: number) => {
  const nl = value.indexOf('\n', at);
  return nl === -1 ? value.length : nl;
};

/**
 * Extend the selection by one step in `key`'s direction. The anchor (the end
 * the selection grows from) stays; the caret moves. An empty selection anchors
 * at the caret, so the first arrow starts a highlight.
 */
export function extendSelection(o: SelectionOptions): SelectionResult {
  const { value, selection, key } = o;
  const len = value.length;
  const { start, end } = selection;

  if (key === 'ArrowRight') {
    const caret = Math.min(len, end + 1);
    return { next: { start, end: caret }, caret };
  }
  if (key === 'ArrowLeft') {
    const caret = Math.max(0, start - 1);
    return { next: { start: caret, end }, caret };
  }
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    // Move a line, keeping the column when there is one to keep.
    const from = key === 'ArrowUp' ? start : end;
    const col = from - lineStart(value, from);
    const targetLineStart = key === 'ArrowUp'
      ? (from > 0 ? lineStart(value, from - 1) : 0)
      : (lineEnd(value, from) < len ? lineEnd(value, from) + 1 : len);
    const caret = Math.min(len, targetLineStart + col);
    const anchor = start === end ? (key === 'ArrowUp' ? end : start) : (key === 'ArrowUp' ? end : start);
    return { next: { start: Math.min(anchor, caret), end: Math.max(anchor, caret) }, caret };
  }
  return { next: selection, caret: end };
}
