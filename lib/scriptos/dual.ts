// Dual dialogue on the line under the caret: a caret `^` on a character cue
// (Fountain's own spelling). Pure — the editor supplies the text and the caret.

const HEADING = /^(INT|EXT|EST|I\/E)[.\s]/;

export type DualToggle = { next: string; added: boolean } | null;

/** Toggle `^` on the cue the caret is on; null when that line is not a character cue. */
export function toggleDualCaret(content: string, cursor: number): DualToggle {
  const lineStart = content.lastIndexOf('\n', cursor - 1) + 1;
  const le = content.indexOf('\n', cursor);
  const lineEnd = le === -1 ? content.length : le;
  const line = content.substring(lineStart, lineEnd);
  const leading = line.length - line.trimStart().length;
  const rest = line.slice(leading);
  const core = rest.replace(/^\^/, '').trim();
  const isCue = core.length > 1 && core === core.toUpperCase() && /[A-Z]/.test(core) && !HEADING.test(core) && !core.endsWith(':');
  if (!isCue) return null;
  const had = rest.startsWith('^');
  const newRest = had ? rest.slice(1) : '^' + rest;
  return { next: content.substring(0, lineStart) + line.slice(0, leading) + newRest + content.substring(lineEnd), added: !had };
}
