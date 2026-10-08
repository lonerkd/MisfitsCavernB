import { describe, expect, it } from 'vitest';
import { emphasisSegments, hasEmphasis, type EmphasisSegment } from './emphasis';

const join = (segs: EmphasisSegment[]) => segs.map((s) => s.text).join('');
/** A compact picture: plain text as is, styled text in brackets with b/i/u, markers in braces. */
const show = (line: string) => emphasisSegments(line).map((s) => {
  if (s.marker) return `{${s.text}}`;
  const f = `${s.bold ? 'b' : ''}${s.italic ? 'i' : ''}${s.underline ? 'u' : ''}`;
  return f ? `[${f}:${s.text}]` : s.text;
}).join('');

describe('emphasisSegments', () => {
  it('italic, bold, bold italic, underline', () => {
    expect(show('She is *very* late.')).toBe('She is {*}[i:very]{*} late.');
    expect(show('He is **not** coming.')).toBe('He is {**}[b:not]{**} coming.');
    expect(show('***Stop.***')).toBe('{***}[bi:Stop.]{***}');
    expect(show('An _underlined_ word.')).toBe('An {_}[u:underlined]{_} word.');
  });

  it('nests in either order', () => {
    expect(show('_**loud and clear**_')).toBe('{_}{**}[bu:loud and clear]{**}{_}');
    expect(show('**the _one_ thing**')).toBe('{**}[b:the ]{_}[bu:one]{_}[b: thing]{**}');
  });

  it('leaves unmatched or spaced markers as text', () => {
    expect(show('2 * 3 = 6')).toBe('2 * 3 = 6');
    expect(show('a *dangling marker')).toBe('a *dangling marker');
    expect(show('snake_case_name')).toBe('snake{_}[u:case]{_}name');
    expect(show('** not bold **')).toBe('** not bold **');
  });

  it('escapes with a backslash', () => {
    expect(show('5 \\* 4 is \\*not\\* emphasis')).toBe('5 {\\}* 4 is {\\}*not{\\}* emphasis');
  });

  it('never changes the text: every segment joined is the line', () => {
    for (const line of [
      '', 'plain', 'She is *very* late.', '***x***', '_a_ *b* **c**', '*a **b** c*', '****', '*', '_', '\\*', 'a*b*c', '* * *', '**unclosed', '_**x**_ y _z_',
    ]) expect(join(emphasisSegments(line))).toBe(line);
  });

  it('hasEmphasis', () => {
    expect(hasEmphasis('INT. HOUSE - DAY')).toBe(false);
    expect(hasEmphasis('2 * 3')).toBe(false);
    expect(hasEmphasis('a *b* c')).toBe(true);
  });
});
