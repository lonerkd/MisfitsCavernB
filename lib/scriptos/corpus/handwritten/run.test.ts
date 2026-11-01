import { describe, expect, it } from 'vitest';
import { parseScript } from '../../parser';
import { HAND_SCRIPTS } from './real-conventions';

const CODE: Record<string, string> = { S: 'slug', A: 'action', C: 'character', D: 'dialogue', P: 'parenthetical', T: 'transition' };

/** The expected type and the text for each labelled line, and the same text as the parser sees it. */
function prepare(lines: string[]) {
  const expected = lines.map((raw) => (raw === '' ? { type: 'empty', text: '' } : { type: raw[1] === '|' ? (raw[0] === '?' ? '?' : CODE[raw[0]]) : 'bad', text: raw.slice(2) }));
  return { expected, source: expected.map((e) => e.text).join('\n') };
}

describe('hand-written scripts', () => {
  for (const script of HAND_SCRIPTS) {
    it(`${script.name}: ${script.note}`, () => {
      const { expected, source } = prepare(script.lines);
      const read = parseScript(source).lines;
      const wrong: string[] = [];
      expected.forEach((want, i) => {
        if (want.type === '?') return;
        const got = read[i]?.type;
        if (got !== want.type) wrong.push(`line ${i + 1} "${want.text}": expected ${want.type}, read ${got}`);
      });
      expect(wrong).toEqual([]);
    });
  }
});
