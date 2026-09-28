import { describe, it, expect } from 'vitest';
import {
  EMPTY_CONTEXT, briefProgress, briefSummary, implications, isAsked, nextMoves, shootDaysNeeded, suggestChannels, visibleQuestions,
  type BriefQuestion, type ChannelPreset, type MoveInput,
} from './core';

const q = (o: Partial<BriefQuestion> & Pick<BriefQuestion, 'key' | 'phase' | 'kind'>): BriefQuestion => ({
  label: o.key, hint: '', options: [], unit: null, min_value: null, max_value: null, ask_when: {}, position: 0, ...o,
});

const QUESTIONS: BriefQuestion[] = [
  q({ key: 'genre', phase: 'development', kind: 'many', position: 0, ask_when: { not_formats: ['Podcast'] }, options: [
    { id: 'drama', label: 'Drama' },
    { id: 'horror', label: 'Horror', implies: { crafts: ['SFX makeup artist'], breakdown: ['makeup', 'sfx'] } },
    { id: 'action', label: 'Action', implies: { crafts: ['Stunt performer'], breakdown: ['stunts'] } },
  ] }),
  q({ key: 'target_runtime', phase: 'development', kind: 'number', unit: 'minutes', min_value: 1, max_value: 600, position: 2 }),
  q({ key: 'goal', phase: 'development', kind: 'many', position: 4, options: [{ id: 'festivals', label: 'Festivals' }, { id: 'online', label: 'Online release' }] }),
  q({ key: 'budget_tier', phase: 'pre-production', kind: 'one', position: 10, options: [
    { id: 'micro', label: 'Micro-budget', implies: { pages_per_day: 5 } },
    { id: 'indie', label: 'Independent', implies: { pages_per_day: 3 } },
  ] }),
  q({ key: 'shoot_days', phase: 'pre-production', kind: 'number', unit: 'days', min_value: 1, max_value: 300, position: 11 }),
  q({ key: 'needs', phase: 'pre-production', kind: 'many', position: 15, options: [
    { id: 'night', label: 'Night exteriors', implies: { crafts: ['Gaffer'], breakdown: ['equipment'] } },
  ] }),
  q({ key: 'dailies', phase: 'production', kind: 'one', position: 20, options: [{ id: 'daily', label: 'Every day', implies: { channels: ['dailies'] } }, { id: 'later', label: 'Later' }] }),
  q({ key: 'festivals', phase: 'delivery', kind: 'many', position: 40, ask_when: { answer: { goal: ['festivals'] } }, options: [{ id: 'shorts', label: 'Shorts' }] }),
];

const input = (o: Partial<MoveInput>): MoveInput => ({
  questions: QUESTIONS, answers: {}, format: 'Feature', phase: 'development', context: EMPTY_CONTEXT, script: null, ...o,
});

describe('which questions apply', () => {
  it('follows the format and earlier answers', () => {
    expect(isAsked(QUESTIONS[0], {}, 'Podcast')).toBe(false);
    expect(isAsked(QUESTIONS[0], {}, 'Feature')).toBe(true);
    const festivals = QUESTIONS.find((x) => x.key === 'festivals')!;
    expect(isAsked(festivals, {}, 'Feature')).toBe(false);
    expect(isAsked(festivals, { goal: ['online'] }, 'Feature')).toBe(false);
    expect(isAsked(festivals, { goal: ['festivals'] }, 'Feature')).toBe(true);
  });

  it('orders by phase, then position', () => {
    expect(visibleQuestions([...QUESTIONS].reverse(), {}, 'Feature').map((x) => x.key))
      .toEqual(['genre', 'target_runtime', 'goal', 'budget_tier', 'shoot_days', 'needs', 'dailies']);
  });

  it('counts answers up to a phase', () => {
    expect(briefProgress(QUESTIONS, { genre: ['drama'], target_runtime: 12 }, 'Feature', 'development')).toEqual({ answered: 2, of: 3 });
  });
});

describe('what the brief implies', () => {
  it('collects crafts, breakdown, channels and pace — with the reasons', () => {
    const im = implications(QUESTIONS, { genre: ['horror', 'action'], budget_tier: 'micro', needs: ['night'], dailies: 'daily' }, 'Feature');
    expect(im.crafts.sort()).toEqual(['Gaffer', 'SFX makeup artist', 'Stunt performer']);
    expect(im.breakdown.sort()).toEqual(['equipment', 'makeup', 'sfx', 'stunts']);
    expect(im.channels).toEqual(['dailies']);
    expect(im.pagesPerDay).toBe(5);
    expect(im.because['craft:Gaffer']).toEqual(['Night exteriors']);
  });

  it('ignores answers to questions that no longer apply', () => {
    expect(implications(QUESTIONS, { genre: ['horror'] }, 'Podcast').crafts).toEqual([]);
  });

  it('summarises the project in a line', () => {
    expect(briefSummary(QUESTIONS, { genre: ['horror', 'drama'], target_runtime: 12, goal: ['festivals'] }, 'Feature')).toBe('Horror, Drama · 12 min · Festivals');
  });

  it('works out shooting days from pages and pace', () => {
    expect(shootDaysNeeded(12, 5)).toBe(3);
    expect(shootDaysNeeded(0.5, 5)).toBe(1);
  });
});

describe('next moves', () => {
  it('asks this phase’s questions first, and looks one phase ahead', () => {
    const moves = nextMoves(input({}));
    const asks = moves.filter((m) => m.kind === 'ask').map((m) => m.question);
    expect(asks).toEqual(['genre', 'target_runtime', 'goal', 'budget_tier', 'shoot_days', 'needs']);
    expect(asks).not.toContain('dailies');
  });

  it('measures the script against the target length', () => {
    const over = nextMoves(input({ answers: { target_runtime: 10 }, script: { pages: 14, runtimeSeconds: 14 * 60 } }));
    expect(over.find((m) => m.id === 'runtime')?.title).toBe('The script runs about 14 min — 40% over your 10-minute target');
    const close = nextMoves(input({ answers: { target_runtime: 10 }, script: { pages: 10.5, runtimeSeconds: 630 } }));
    expect(close.find((m) => m.id === 'runtime')).toBeUndefined();
  });

  it('flags a festival short over 40 minutes', () => {
    const m = nextMoves(input({ format: 'Short Film', answers: { goal: ['festivals'], target_runtime: 45 } }));
    expect(m.find((x) => x.id === 'short-length')).toBeDefined();
    expect(nextMoves(input({ format: 'Feature', answers: { goal: ['festivals'], target_runtime: 45 } })).find((x) => x.id === 'short-length')).toBeUndefined();
  });

  it('checks the planned shoot against the budget’s pace', () => {
    const base = { phase: 'pre-production' as const, script: { pages: 20, runtimeSeconds: 1200 } };
    const short = nextMoves(input({ ...base, answers: { budget_tier: 'indie', shoot_days: 4 } }));
    expect(short.find((m) => m.id === 'shoot-days')).toMatchObject({ kind: 'warn', title: expect.stringContaining('around 7 shooting days — you’ve planned 4') });
    const fine = nextMoves(input({ ...base, answers: { budget_tier: 'micro', shoot_days: 4 } }));
    expect(fine.find((m) => m.id === 'shoot-days')).toBeUndefined();
    const unplanned = nextMoves(input({ ...base, answers: { budget_tier: 'micro' } }));
    expect(unplanned.find((m) => m.id === 'shoot-days')).toMatchObject({ kind: 'tip' });
  });

  it('names the roles the brief needs that the crew doesn’t have', () => {
    const m = nextMoves(input({ phase: 'pre-production', answers: { genre: ['horror'], needs: ['night'] }, context: { ...EMPTY_CONTEXT, crafts: ['Gaffer'] } }));
    const roles = m.find((x) => x.id === 'roles')!;
    expect(roles.crafts).toEqual(['SFX makeup artist']);
    expect(roles.detail).toContain('Horror');
  });

  it('points at breakdown categories the brief needs but nothing is tagged under', () => {
    const context = { ...EMPTY_CONTEXT, scenes: 6, breakdown: { stunts: { label: 'Stunts', n: 0 }, makeup: { label: 'Hair & makeup', n: 2 }, sfx: { label: 'Special effects', n: 0 } } };
    const m = nextMoves(input({ phase: 'pre-production', answers: { genre: ['horror', 'action'] }, context }));
    expect(m.find((x) => x.id === 'breakdown')?.title).toBe('Nothing tagged under Special effects and Stunts yet');
    expect(nextMoves(input({ phase: 'development', answers: { genre: ['horror'] }, context })).find((x) => x.id === 'breakdown')).toBeUndefined();
  });

  it('reads the script’s night exteriors, references and casting', () => {
    const context = { ...EMPTY_CONTEXT, scenes: 10, night_exteriors: 4, scenes_with_refs: 2, characters: 5, cast: 2 };
    const ids = nextMoves(input({ phase: 'pre-production', context })).map((m) => m.id);
    expect(ids).toEqual(expect.arrayContaining(['night', 'references', 'casting']));
    const withGaffer = nextMoves(input({ phase: 'pre-production', context: { ...context, crafts: ['Gaffer'] } }));
    expect(withGaffer.find((m) => m.id === 'night')).toBeUndefined();
  });

  it('suggests channels the brief asks for once there is a crew', () => {
    const m = nextMoves(input({ phase: 'production', answers: { dailies: 'daily' }, context: { ...EMPTY_CONTEXT, crew: 3 } }));
    expect(m.find((x) => x.id === 'channels')?.channels).toEqual(['dailies']);
    expect(nextMoves(input({ phase: 'production', answers: { dailies: 'daily' }, context: { ...EMPTY_CONTEXT, crew: 3, channels: ['dailies'] } })).find((x) => x.id === 'channels')).toBeUndefined();
  });

  it('ranks by weight', () => {
    const m = nextMoves(input({ phase: 'pre-production', answers: { target_runtime: 10 }, script: { pages: 20, runtimeSeconds: 1200 } }));
    const w = m.map((x) => x.weight);
    expect(w).toEqual([...w].sort((a, b) => b - a));
  });
});

describe('channel suggestions', () => {
  const preset = (key: string, phase: ChannelPreset['phase'], audience: ChannelPreset['audience'] = 'team', position = 0): ChannelPreset =>
    ({ key, name: key, type: 'text', audience, post_policy: 'viewers', topic: '', phase, why: '', position });
  const presets = [preset('legal', 'development', 'owners', 1), preset('guests', 'pre-production', 'guests', 2), preset('dailies', 'production', 'team', 3)];

  it('offers what the phase has reached, not what is open, and guests only with viewers', () => {
    expect(suggestChannels(presets, { phase: 'pre-production', context: EMPTY_CONTEXT, implied: [] }).map((p) => p.key)).toEqual(['legal']);
    expect(suggestChannels(presets, { phase: 'pre-production', context: { ...EMPTY_CONTEXT, viewers: 1 }, implied: [] }).map((p) => p.key)).toEqual(['legal', 'guests']);
    expect(suggestChannels(presets, { phase: 'development', context: { ...EMPTY_CONTEXT, channels: ['Legal'] }, implied: ['dailies'] }).map((p) => p.key)).toEqual(['dailies']);
  });
});
