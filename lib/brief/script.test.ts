import { describe, it, expect } from 'vitest';
import { scanScript, sceneList, wordPattern } from './script';
import { implications, nextMoves, EMPTY_CONTEXT, type BriefQuestion } from './core';

const NEEDS: BriefQuestion = {
  key: 'needs', phase: 'pre-production', label: 'Anything special on set?', hint: '', kind: 'many', unit: null, min_value: null, max_value: null, ask_when: {}, position: 15,
  options: [
    { id: 'stunts', label: 'Stunts or fights', implies: { crafts: ['Stunt performer'], breakdown: ['stunts'] }, detect: { words: ['fight', 'punch', 'crash'] } },
    { id: 'night', label: 'Night exteriors', implies: { crafts: ['Gaffer'] }, detect: { night_exteriors: true } },
    { id: 'children', label: 'Children', detect: { words: ['kid'], ages_under: 13 } },
    { id: 'animals', label: 'Animals', detect: { words: ['dog'] } },
  ],
};

const lines = (...xs: Array<[string, string]>) => xs.map(([type, text]) => ({ type, text }));
const SCRIPT = lines(
  ['slug', 'INT. KITCHEN - DAY'], ['action', 'TOMMY (8) eats cereal. His mother reads.'],
  ['slug', 'EXT. ALLEY - NIGHT'], ['action', 'Two men fight. One punches the other into a wall.'],
  ['slug', 'INT./EXT. CAR - NIGHT'], ['action', 'The car swerves. Nobody is hurt.'],
  ['slug', 'EXT. PARK - DAY'], ['action', 'A punchline lands. Everyone laughs.'],
);

describe('reading the brief out of the script', () => {
  it('finds words, night exteriors and young characters, by scene', () => {
    const ev = scanScript(SCRIPT, [NEEDS]);
    expect(ev.find((e) => e.option === 'stunts')).toMatchObject({ scenes: [2], hits: ['fight', 'punches'] });
    expect(ev.find((e) => e.option === 'night')).toMatchObject({ scenes: [2, 3] });
    expect(ev.find((e) => e.option === 'children')).toMatchObject({ scenes: [1], hits: ['TOMMY (8)'] });
    expect(ev.find((e) => e.option === 'animals')).toBeUndefined();
  });

  it('matches whole words with endings, not parts of words', () => {
    const re = wordPattern(['punch', 'fire at'])!;
    expect('He punched him. Punches. punching'.match(re)).toEqual(['punched', 'Punches', 'punching']);
    expect('A punchline.'.match(re)).toBeNull();
    expect('They fire  at the door'.match(re)).toEqual(['fire  at']);
  });

  it('names scenes briefly', () => {
    expect(sceneList([3])).toBe('scene 3');
    expect(sceneList([3, 7])).toBe('scenes 3 and 7');
    expect(sceneList([1, 2, 3, 4, 5])).toBe('scenes 1, 2, 3 and 2 more');
  });

  it('counts what the script shows until the question is answered', () => {
    const ev = scanScript(SCRIPT, [NEEDS]);
    const open = implications([NEEDS], {}, 'Feature', ev);
    expect(open.crafts.sort()).toEqual(['Gaffer', 'Stunt performer']);
    expect(open.because['craft:Stunt performer']).toEqual(['stunts or fights in the script (scene 2)']);
    const answered = implications([NEEDS], { needs: ['night'] }, 'Feature', ev);
    expect(answered.crafts).toEqual(['Gaffer']);
  });

  it('suggests the findings as a move, with the options to add', () => {
    const ev = scanScript(SCRIPT, [NEEDS]);
    const input = { questions: [NEEDS], format: 'Feature', phase: 'pre-production' as const, context: EMPTY_CONTEXT, script: { pages: 3, runtimeSeconds: 180, evidence: ev } };
    const open = nextMoves({ ...input, answers: {} }).find((m) => m.id === 'script:needs')!;
    expect(open.title).toMatch(/^From the script: stunts or fights \(scene 2\), night exteriors \(scenes 2 and 3\) and children \(scene 1\)/);
    expect(open.suggest?.map((s) => s.option)).toEqual(['stunts', 'night', 'children']);
    expect(nextMoves({ ...input, answers: {} }).find((m) => m.id === 'roles')?.crafts?.sort()).toEqual(['Gaffer', 'Stunt performer']);
    const later = nextMoves({ ...input, answers: { needs: ['night', 'stunts'] } }).find((m) => m.id === 'script:needs')!;
    expect(later.title).toBe('The script also has: children (scene 1)');
  });
});
