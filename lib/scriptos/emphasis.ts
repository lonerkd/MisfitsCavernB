// Fountain emphasis in one line of text, for the write surface: *italic*,
// **bold**, ***bold italic***, _underline_, nested in any order; \* and \_
// are literal. Emphasis never crosses a line.
//
// The segments' text joined back together is exactly the input — markers
// included (flagged `marker`, drawn dimmed). The editor draws them under a
// transparent textarea, so every character has to stay where it is: the
// script font (Courier Prime) is monospaced in all four faces, so bold and
// italic keep each character's width.

export interface EmphasisSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  /** An emphasis marker (* _) or an escaping backslash — shown dimmed. */
  marker?: boolean;
}

interface Style { bold: boolean; italic: boolean; underline: boolean }

const STAR_STYLES: Record<number, Partial<Style>> = { 1: { italic: true }, 2: { bold: true }, 3: { bold: true, italic: true } };

/** Length of the run of `ch` starting at i. */
function runAt(s: string, i: number, ch: string): number {
  let n = 0;
  while (s[i + n] === ch) n++;
  return n;
}

/** Where the matching closer for a marker of `len` × `ch` opened at `from` starts, or -1. */
function closerFor(s: string, from: number, ch: string, len: number): number {
  for (let i = from; i < s.length; i++) {
    if (s[i] === '\\') { i++; continue; }
    if (s[i] !== ch) continue;
    const run = runAt(s, i, ch);
    // A closer hugs the text before it, and is exactly as long as the opener
    // (a longer run of stars may hold a nested closer at its end).
    if (s[i - 1] !== ' ' && i > from) {
      if (run === len) return i;
      if (ch === '*' && run > len) return i + run - len;
    }
    i += run - 1;
  }
  return -1;
}

function push(out: EmphasisSegment[], seg: EmphasisSegment) {
  if (!seg.text) return;
  const last = out[out.length - 1];
  if (last && !!last.bold === !!seg.bold && !!last.italic === !!seg.italic && !!last.underline === !!seg.underline && !!last.marker === !!seg.marker) {
    last.text += seg.text;
    return;
  }
  out.push(seg);
}

function styled(text: string, st: Style, marker = false): EmphasisSegment {
  const seg: EmphasisSegment = { text };
  if (st.bold) seg.bold = true;
  if (st.italic) seg.italic = true;
  if (st.underline) seg.underline = true;
  if (marker) seg.marker = true;
  return seg;
}

function parse(s: string, st: Style, out: EmphasisSegment[]) {
  let plain = '';
  const flush = () => { push(out, styled(plain, st)); plain = ''; };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && (s[i + 1] === '*' || s[i + 1] === '_')) {
      flush();
      push(out, styled('\\', st, true));
      plain += s[i + 1];
      i++;
      continue;
    }
    if (c === '*' || c === '_') {
      const run = runAt(s, i, c);
      const len = c === '_' ? 1 : Math.min(run, 3);
      const start = i + run - len; // a longer run of stars: the extra ones are text
      const opensText = s[start + len] !== undefined && s[start + len] !== ' ' && s[start + len] !== c;
      const close = opensText ? closerFor(s, start + len, c, len) : -1;
      if (close > start + len) {
        plain += s.slice(i, start);
        flush();
        const inner = c === '_' ? { underline: true } : STAR_STYLES[len];
        const next: Style = { bold: st.bold || !!inner.bold, italic: st.italic || !!inner.italic, underline: st.underline || !!inner.underline };
        push(out, styled(s.slice(start, start + len), next, true));
        parse(s.slice(start + len, close), next, out);
        push(out, styled(s.slice(close, close + len), next, true));
        i = close + len - 1;
        continue;
      }
      plain += s.slice(i, i + run);
      i += run - 1;
      continue;
    }
    plain += c;
  }
  flush();
}

/** The line as styled runs (their text joined is exactly `line`). */
export function emphasisSegments(line: string): EmphasisSegment[] {
  const out: EmphasisSegment[] = [];
  if (line.indexOf('*') < 0 && line.indexOf('_') < 0) return line ? [{ text: line }] : [];
  parse(line, { bold: false, italic: false, underline: false }, out);
  return out;
}

/** Whether a line has any emphasis to draw. */
export function hasEmphasis(line: string): boolean {
  return emphasisSegments(line).some((s) => s.bold || s.italic || s.underline);
}
