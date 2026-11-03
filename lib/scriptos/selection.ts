// Quick actions on a selection in the editor's Write view: change its case, or
// duplicate the lines it covers. Pure — the caller owns the textarea — so the
// result and the selection that should follow are testable without a browser.

export type SelectionAction = 'upper' | 'lower' | 'duplicate-line';

const transform = (text: string, action: SelectionAction): string => (
  action === 'upper' ? text.toUpperCase() : text.toLowerCase()
);

/** The whole lines around a caret offset (without the newlines). */
function lineBounds(content: string, at: number): { from: number; to: number } {
  const from = content.lastIndexOf('\n', Math.max(0, at - 1)) + 1;
  const next = content.indexOf('\n', at);
  return { from, to: next === -1 ? content.length : next };
}

/**
 * Apply `action` to `content` at the selection `[start, end)`.
 * Returns the new text and the selection to keep — the transformed text for a
 * case change, the copy for a duplicate. null when the action needs a selection
 * and there isn't one (a duplicate of the caret's line always works).
 */
export function applySelectionAction(
  content: string,
  start: number,
  end: number,
  action: SelectionAction,
): { next: string; start: number; end: number } | null {
  if (action !== 'duplicate-line') {
    if (end <= start) return null;
    const changed = transform(content.slice(start, end), action);
    if (changed === content.slice(start, end)) return { next: content, start, end };
    return { next: content.slice(0, start) + changed + content.slice(end), start, end: start + changed.length };
  }

  const first = lineBounds(content, start);
  const last = lineBounds(content, Math.max(start, end > start ? end - 1 : end));
  const block = content.slice(first.from, last.to);
  const at = last.to;
  // Put the copy on its own line, after the original, and select it.
  const next = content.slice(0, at) + '\n' + block + content.slice(at);
  return { next, start: at + 1, end: at + 1 + block.length };
}
