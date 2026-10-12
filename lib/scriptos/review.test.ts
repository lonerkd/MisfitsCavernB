import { describe, expect, it } from 'vitest';
import { parseScript } from './parser';
import { doubtfulReads, nameOf } from './review';

const HEAD = 'INT. ROOM - DAY\n\n';
const doubts = (src: string) => doubtfulReads(parseScript(src, 'screenplay').lines);

describe('doubtful reads', () => {
  it('a clean script has none', () => {
    expect(doubts(`${HEAD}MAYA\nHi.\n\nLEO\nHello.\n\nMAYA\nBye.\n\nLEO\nSee you.\n`)).toEqual([]);
  });

  it('a name seen speaking once is offered, with a verdict name', () => {
    const d = doubts(`${HEAD}MAYA\nHi.\n\nLEO\nHello.\n\nMAYA\nBye.\n\nLEO\nOk.\n\nDARKNESS\nMaya waits.\n`);
    const hit = d.find((x) => x.name === 'DARKNESS');
    expect(hit).toBeTruthy();
    expect(hit!.confidence).toBeLessThan(75);
  });

  it('is least certain first, deduped by name, and capped', () => {
    const src = `${HEAD}${Array.from({ length: 30 }, (_, i) => `WORD${String.fromCharCode(65 + (i % 26))}${i}\nMaya waits.\n`).join('\n')}`;
    const d = doubts(src);
    expect(d.length).toBeLessThanOrEqual(12);
    for (let i = 1; i < d.length; i++) expect(d[i].confidence).toBeGreaterThanOrEqual(d[i - 1].confidence);
  });
});

describe('nameOf', () => {
  it('takes the name out of a cue and refuses prose', () => {
    expect(nameOf('MAYA (V.O.)')).toBe('MAYA');
    expect(nameOf('Maya ducks.')).toBeNull();
    expect(nameOf('THE DOOR EXPLODES.')).toBeNull();
  });
});
