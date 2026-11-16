import { describe, it, expect } from 'vitest';
import type { BriefOption, BriefQuestion } from './core';
import { checkAskWhen, checkOptionRules, checkWords, draftFromAskWhen, draftFromOption, splitList } from './rules';

const opt: BriefOption = { id: 'stunts', label: 'Stunts', hint: 'h', implies: { crafts: ['Stunt performer'], pages_per_day: 2 }, detect: { words: ['fight'], ages_under: 13 } };
const q = (key: string, ids: string[]): BriefQuestion => ({ key, phase: 'development', label: key, hint: '', kind: 'many', options: ids.map((id) => ({ id, label: id })), unit: null, min_value: null, max_value: null, ask_when: {}, position: 0 });
const empty = { crafts: '', breakdown: '', channels: '', pagesPerDay: '', words: '', nightExteriors: false, agesUnder: '' };

describe('splitList', () => {
  it('trims, de-duplicates and drops empties', () => {
    expect(splitList(' a, b ,,a\nc ')).toEqual(['a', 'b', 'c']);
  });
});

describe('option rules', () => {
  it('round-trips through the draft', () => {
    const r = checkOptionRules(opt, draftFromOption(opt));
    expect(r).toEqual({ ok: true, value: opt });
  });

  it('keeps id, label and hint and replaces the rules', () => {
    const r = checkOptionRules(opt, { ...empty, breakdown: 'Props, stunts', words: 'Punch, Kick', nightExteriors: true });
    expect(r).toEqual({ ok: true, value: { id: 'stunts', label: 'Stunts', hint: 'h', implies: { breakdown: ['props', 'stunts'] }, detect: { words: ['punch', 'kick'], night_exteriors: true } } });
  });

  it('an empty draft clears both rules', () => {
    const r = checkOptionRules(opt, empty);
    expect(r).toEqual({ ok: true, value: { id: 'stunts', label: 'Stunts', hint: 'h' } });
  });

  it('refuses an unknown role or channel when the catalogue is known, and spells a known one its own way', () => {
    const vocab = { crafts: ['Gaffer'], channels: ['dailies'] };
    expect(checkOptionRules(opt, { ...empty, crafts: 'Gaffer, Wizard' }, vocab)).toMatchObject({ ok: false, error: expect.stringContaining('Wizard') });
    expect(checkOptionRules(opt, { ...empty, channels: 'nope' }, vocab)).toMatchObject({ ok: false });
    expect(checkOptionRules(opt, { ...empty, crafts: 'gaffer' }, vocab)).toMatchObject({ ok: true, value: { implies: { crafts: ['Gaffer'] } } });
  });

  it('checks the numbers and the category keys', () => {
    expect(checkOptionRules(opt, { ...empty, pagesPerDay: '0' }).ok).toBe(false);
    expect(checkOptionRules(opt, { ...empty, pagesPerDay: 'x' }).ok).toBe(false);
    expect(checkOptionRules(opt, { ...empty, agesUnder: '2.5' }).ok).toBe(false);
    expect(checkOptionRules(opt, { ...empty, agesUnder: '100' }).ok).toBe(false);
    expect(checkOptionRules(opt, { ...empty, breakdown: 'Bad Key!' }).ok).toBe(false);
    expect(checkOptionRules(opt, { ...empty, pagesPerDay: '2.5', agesUnder: '18' })).toMatchObject({ ok: true, value: { implies: { pages_per_day: 2.5 }, detect: { ages_under: 18 } } });
  });
});

describe('ask_when', () => {
  const all = [q('goal', ['festivals', 'web']), q('self', ['a'])];

  it('round-trips', () => {
    const w = { formats: ['Feature'], not_formats: ['Podcast'], answer: { goal: ['festivals'] } };
    expect(checkAskWhen(draftFromAskWhen(w), all, 'self')).toEqual({ ok: true, value: w });
  });

  it('an empty draft means always asked', () => {
    expect(checkAskWhen(draftFromAskWhen({}), all, 'self')).toEqual({ ok: true, value: {} });
  });

  it('refuses a missing question, a missing option, self-dependence and a malformed line', () => {
    const d = (answer: string) => ({ formats: '', notFormats: '', answer });
    expect(checkAskWhen(d('nope: a'), all, 'self').ok).toBe(false);
    expect(checkAskWhen(d('goal: tv'), all, 'self')).toMatchObject({ ok: false, error: expect.stringContaining('tv') });
    expect(checkAskWhen(d('self: a'), all, 'self').ok).toBe(false);
    expect(checkAskWhen(d('goal festivals'), all, 'self').ok).toBe(false);
    expect(checkAskWhen(d('goal:'), all, 'self').ok).toBe(false);
  });

  it('refuses an unknown format and a format on both sides', () => {
    expect(checkAskWhen({ formats: 'Mime', notFormats: '', answer: '' }, all, 'self', { formats: ['Feature'] }).ok).toBe(false);
    expect(checkAskWhen({ formats: 'Feature', notFormats: 'Feature', answer: '' }, all, 'self').ok).toBe(false);
  });
});

describe('checkWords', () => {
  it('applies the database limits', () => {
    expect(checkWords('  Goal  ', ' hint ')).toEqual({ ok: true, value: { label: 'Goal', hint: 'hint' } });
    expect(checkWords(' ', '').ok).toBe(false);
    expect(checkWords('x'.repeat(121), '').ok).toBe(false);
    expect(checkWords('x', 'y'.repeat(301)).ok).toBe(false);
  });
});
