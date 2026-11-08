import { describe, expect, it } from 'vitest';
import { parseScript } from './parser';
import { languagesIn } from './languages';
import { scriptKnowledge } from './knowledge';

describe('languagesIn', () => {
  it('reads languages from brackets, and nothing else', () => {
    expect(languagesIn('ABUELA (Spanish)')).toEqual(['Spanish']);
    expect(languagesIn('MARA (sings, Portuguese)')).toEqual(['Portuguese']);
    expect(languagesIn('VOICE (V.O.) (Spanish, muffled)')).toEqual(['Spanish']);
    expect(languagesIn('(in Haitian Creole)')).toEqual(['Haitian Creole']);
    expect(languagesIn('MARA (speaking Yiddish)')).toEqual(['Yiddish']);
    expect(languagesIn('MARA (sings in French)')).toEqual(['French']);
    expect(languagesIn('MARA (Navajo)')).toEqual(['Navajo']);
    expect(languagesIn('MARA (español)')).toEqual(['Spanish']);
    expect(languagesIn('MARA (speaking Quenya)')).toEqual(['Quenya']); // not in the data: after "speaking", one capitalised word is taken as written
    expect(languagesIn('MARA (Spanish accent)')).toEqual([]);
    expect(languagesIn('MARA (in the kitchen)')).toEqual([]);
    expect(languagesIn('MARA (English subtitles)')).toEqual([]);
    expect(languagesIn("TESSA (CONT'D)")).toEqual([]);
    expect(languagesIn('JONAS (soft)')).toEqual([]);
    expect(languagesIn('INES (Spanish and Portuguese)')).toEqual(['Spanish', 'Portuguese']);
  });
});

const SCRIPT = `INT. KITCHEN -- COASTAL TOWN -- DAY (1957)

ABUELA (Spanish)
Come home.

MARA (Portuguese)
No, Abuela.

ABUELA
(in Spanish)
Come home.

MARA
Maybe.

INT. STUDIO -- NIGHT (1964) (PART ONE)

HOST
Welcome.

INT. KITCHEN -- COASTAL TOWN -- DAY (1959)

ABUELA (CONT'D)
Eat.

INT. STUDIO -- NIGHT (PART TWO)

HOST (Portuguese)
Bem-vindos.
`;

describe('scriptKnowledge: the gaps, shown instead of guessed', () => {
  const k = scriptKnowledge(parseScript(`INT. WORKSHOP -- LIGHTHOUSE -- NIGHT

TESSA (quietly)
Hello.

TESSA (V.O.)
Still here.

JONAS (quietly, Spanish)
Hola.

EXT. WORKSHOP -- LIGHTHOUSE -- DAY

JONAS (quietly)
Bye.
`));
  it('lists the cue words nothing recognised, with how often, and not extensions or languages', () => {
    expect(k.vocabulary.cueTags).toEqual([{ tag: 'quietly', count: 3 }]);
  });
  it('lists how headings end and what the reader made of each ending', () => {
    expect(k.vocabulary.headingTails.map((t) => [t.tail, t.count, t.treatedAs])).toEqual(expect.arrayContaining([['NIGHT', 1, 'when'], ['DAY', 1, 'when']]));
  });
});

describe('scriptKnowledge: what the script says about itself', () => {
  const k = scriptKnowledge(parseScript(SCRIPT));
  it('languages: who speaks what, how often, where', () => {
    expect(k.languages.map((l) => [l.language, l.speeches, l.speakers])).toEqual([
      ['Portuguese', 2, ['HOST', 'MARA']],
      ['Spanish', 2, ['ABUELA']],
    ]);
    expect(k.languages.find((l) => l.language === 'Spanish')?.scenes).toEqual([1]);
    expect(k.speakerLanguages.find((s) => s.name === 'HOST')?.languages).toEqual(['Portuguese']);
    expect(k.untaggedSpeeches).toBeGreaterThan(0);
  });
  it('eras, layers and time jumps', () => {
    expect(k.eras).toEqual([{ year: 1957, scenes: 1 }, { year: 1959, scenes: 1 }, { year: 1964, scenes: 1 }]);
    expect(k.frames.map((f) => f.frame)).toEqual(['PART ONE', 'PART TWO']);
    expect(k.timeJumpsBack).toBe(1); // 1964 back to 1959
  });
  it('places are counted once however many hours or years they are set in', () => {
    expect(k.places[0]).toMatchObject({ place: 'KITCHEN', scenes: 2, qualifiers: ['COASTAL TOWN'] });
    expect(k.places.find((p) => p.place === 'STUDIO')?.scenes).toBe(2);
  });
});
