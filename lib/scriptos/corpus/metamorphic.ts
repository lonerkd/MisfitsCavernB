// Metamorphic checks: rewrite a script in a way that means the same thing, and
// the read must not change. They need no labels — so they also work on real
// scripts the owner can't share — and they catch a brain that has learned the
// generator's habits instead of the format.

import { parseScript } from '../parser';
import { generateScript, type Style } from './generate';
import { renderText } from './render';
import { SEEDS } from './run';

/** Changes that leave every element exactly as it was. */
export const TRANSFORMS: Record<string, (text: string) => string> = {
  crlf: (t) => t.replace(/\n/g, '\r\n'),
  trailingSpaces: (t) => t.split('\n').map((l) => (l ? l + '  ' : l)).join('\n'),
  indented: (t) => t.split('\n').map((l) => (l ? '    ' + l : l)).join('\n'),
  doubleBlanks: (t) => t.replace(/\n\n/g, '\n\n\n'),
  noFinalNewline: (t) => t.replace(/\n+$/, ''),
  leadingBlanks: (t) => '\n\n' + t,
};

const typesOf = (text: string) => parseScript(text).lines.filter((l) => l.type !== 'empty').map((l) => l.type);

/** Share of elements whose type is unchanged by the transform (1 = fully stable). */
export function stability(style: Style, transform: (t: string) => string, seeds = SEEDS): number {
  let same = 0;
  let total = 0;
  for (const seed of seeds) {
    const { text } = renderText(generateScript(seed, style));
    const a = typesOf(text);
    const b = typesOf(transform(text));
    const n = Math.max(a.length, b.length);
    total += n;
    for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) same++;
  }
  return total === 0 ? 1 : same / total;
}
