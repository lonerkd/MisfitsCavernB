import { describe, it, expect } from 'vitest';
import {
  ageHits, detectInScene, nightExteriorHits, scanScript, splitScenes, wordHits, wordPattern,
  type DetectableQuestion,
} from './parsers';

const lines = (...xs: Array<[string, string]>) => xs.map(([type, text]) => ({ type, text }));
const q = (key: string, ...options: DetectableQuestion['options']): DetectableQuestion => ({ key, options });

describe('splitScenes', () => {
  it('groups action under its heading, trims headings, ignores other line types', () => {
    const s = splitScenes(lines(['slug', '  INT. A - DAY  '], ['action', 'one'], ['dialogue', 'ignored'], ['action', 'two'], ['slug', 'EXT. B - DAY']));
    expect(s).toEqual([{ heading: 'INT. A - DAY', action: ['one', 'two'] }, { heading: 'EXT. B - DAY', action: [] }]);
  });
  it('drops action before the first heading; empty script has no scenes', () => {
    expect(splitScenes(lines(['action', 'orphan'], ['slug', 'INT. A - DAY']))).toEqual([{ heading: 'INT. A - DAY', action: [] }]);
    expect(splitScenes([])).toEqual([]);
  });
});

describe('wordPattern', () => {
  it('is null without usable words', () => {
    expect(wordPattern([])).toBeNull();
    expect(wordPattern(['  ', ''])).toBeNull();
  });
  it('matches whole words with endings, case-insensitively, and flexible spaces', () => {
    const re = wordPattern(['punch', 'fire at'])!;
    expect('He punched him. Punches. punching'.match(re)).toEqual(['punched', 'Punches', 'punching']);
    expect('A punchline.'.match(re)).toBeNull();
    expect('They fire  at the door'.match(re)).toEqual(['fire  at']);
  });
  it('escapes regex characters in words', () => {
    expect('a.b and axb'.match(wordPattern(['a.b'])!)).toEqual(['a.b']);
  });
});

describe('extractors', () => {
  it('nightExteriorHits: exterior headings with NIGHT only', () => {
    expect(nightExteriorHits('EXT. ALLEY - NIGHT')).toEqual(['EXT. ALLEY - NIGHT']);
    expect(nightExteriorHits('INT./EXT. CAR - NIGHT')).toHaveLength(1);
    expect(nightExteriorHits('EXT/INT. HOUSE - night')).toHaveLength(1);
    expect(nightExteriorHits('I/E CAR - NIGHT')).toHaveLength(1);
    expect(nightExteriorHits('INT. KITCHEN - NIGHT')).toEqual([]);
    expect(nightExteriorHits('EXT. PARK - DAY')).toEqual([]);
    expect(nightExteriorHits('EXT. PARK - MIDNIGHTS')).toEqual([]);
  });
  it('wordHits: lower-cased matches as written', () => {
    expect(wordHits('Two men FIGHT. One crashes.', wordPattern(['fight', 'crash'])!)).toEqual(['fight', 'crashes']);
  });
  it('ageHits: only under the limit, only capitalised intros', () => {
    expect(ageHits('TOMMY (8) eats. MARY JANE (12) waits. BOB (13) stands. old man (5) sits.', 13)).toEqual(['TOMMY (8)', 'MARY JANE (12)']);
    expect(ageHits('TOMMY (8)', 8)).toEqual([]);
  });
  it('detectInScene composes them in reading order and honours each flag', () => {
    const scene = { heading: 'EXT. ALLEY - NIGHT', action: ['TOMMY (8) fights.', 'A dog barks.'] };
    const re = wordPattern(['fight', 'dog']);
    expect(detectInScene(scene, { night_exteriors: true, words: ['fight', 'dog'], ages_under: 13 }, re))
      .toEqual(['EXT. ALLEY - NIGHT', 'fights', 'TOMMY (8)', 'dog']);
    expect(detectInScene(scene, { words: ['dog'] }, wordPattern(['dog']))).toEqual(['dog']);
    expect(detectInScene(scene, {}, null)).toEqual([]);
  });
});

describe('scanScript', () => {
  const SCRIPT = lines(
    ['action', 'A dog before any scene.'],
    ['slug', 'INT. KITCHEN - DAY'], ['action', 'TOMMY (8) eats cereal.'],
    ['slug', 'EXT. ALLEY - NIGHT'], ['action', 'Two men fight. One fights again.'],
    ['slug', 'EXT. PARK - NIGHT'], ['action', 'A dog barks.'],
    ['slug', 'INT. ROOM - DAY'], ['action', 'The dog sleeps.'],
  );

  it('reports scenes 1-based in order with deduped hits, skipping options without detect', () => {
    const ev = scanScript(SCRIPT, [q('k',
      { id: 'night', label: 'Night', detect: { night_exteriors: true } },
      { id: 'plain', label: 'Plain' },
      { id: 'dogs', label: 'Dogs', detect: { words: ['dog'] } },
      { id: 'kids', label: 'Kids', detect: { ages_under: 10 } },
    )]);
    expect(ev.map((e) => e.option)).toEqual(['night', 'dogs', 'kids']);
    expect(ev[0]).toEqual({ question: 'k', option: 'night', label: 'Night', scenes: [2, 3], hits: ['EXT. ALLEY - NIGHT', 'EXT. PARK - NIGHT'] });
    expect(ev[1]).toMatchObject({ scenes: [3, 4], hits: ['dog'] });
    expect(ev[2]).toMatchObject({ scenes: [1], hits: ['TOMMY (8)'] });
  });

  it('ignores action before the first heading', () => {
    const ev = scanScript(SCRIPT, [q('k', { id: 'dogs', label: 'Dogs', detect: { words: ['dog'] } })]);
    expect(ev[0].scenes).not.toContain(0);
  });

  it('caps hits at six distinct', () => {
    const many = lines(['slug', 'INT. A - DAY'], ['action', 'a b c d e f g h']);
    const ev = scanScript(many, [q('k', { id: 'x', label: 'X', detect: { words: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] } })]);
    expect(ev[0].hits).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('finds nothing in an empty script, no questions, or empty words', () => {
    expect(scanScript([], [q('k', { id: 'x', label: 'X', detect: { night_exteriors: true } })])).toEqual([]);
    expect(scanScript(SCRIPT, [])).toEqual([]);
    expect(scanScript(SCRIPT, [q('k', { id: 'x', label: 'X', detect: { words: [] } })])).toEqual([]);
  });

  it('is repeatable (global regexes keep no state between runs)', () => {
    const questions = [q('k', { id: 'dogs', label: 'Dogs', detect: { words: ['dog'] } })];
    expect(scanScript(SCRIPT, questions)).toEqual(scanScript(SCRIPT, questions));
  });
});
