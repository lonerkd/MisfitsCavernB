import { describe, expect, it } from 'vitest';
import { checkQuestion, slug, type QuestionInput } from './check';

const base: QuestionInput = { key: '', phase: 'development', label: ' Where will it  play? ', hint: '', kind: 'one', optionsText: 'Festival circuit\n\nStreaming\n', unit: '', min: '', max: '' };

describe('checkQuestion', () => {
  it('accepts a choice question, tidied, with ids made from the options', () => {
    expect(checkQuestion(base)).toEqual({
      ok: true,
      value: { key: 'where_will_it_play', phase: 'development', label: 'Where will it play?', hint: '', kind: 'one', options: [{ id: 'festival_circuit', label: 'Festival circuit' }, { id: 'streaming', label: 'Streaming' }], unit: null, min_value: null, max_value: null },
    });
  });
  it('accepts a number question and drops options', () => {
    const r = checkQuestion({ ...base, kind: 'number', unit: ' min ', min: '1', max: '240', optionsText: 'ignored' });
    expect(r).toMatchObject({ ok: true, value: { kind: 'number', options: [], unit: 'min', min_value: 1, max_value: 240 } });
  });
  it('says what is wrong, in words', () => {
    expect(checkQuestion({ ...base, label: ' ' })).toEqual({ ok: false, error: 'Give the question some words.' });
    expect(checkQuestion({ ...base, label: 'x'.repeat(121) })).toMatchObject({ ok: false });
    expect(checkQuestion({ ...base, hint: 'x'.repeat(301) })).toMatchObject({ ok: false });
    expect(checkQuestion({ ...base, key: 'Bad Key' })).toMatchObject({ ok: false });
    expect(checkQuestion({ ...base, optionsText: 'Only one' })).toEqual({ ok: false, error: 'Give at least two options, one per line.' });
    expect(checkQuestion({ ...base, optionsText: 'Same\nsame' })).toMatchObject({ ok: false });
    expect(checkQuestion({ ...base, optionsText: 'A!!\n???' })).toMatchObject({ ok: false });
    expect(checkQuestion({ ...base, phase: 'launch' as never })).toEqual({ ok: false, error: 'Pick a phase and a kind.' });
  });
  it('checks the range of a number question', () => {
    expect(checkQuestion({ ...base, kind: 'number', min: '', max: '5' })).toMatchObject({ ok: false });
    expect(checkQuestion({ ...base, kind: 'number', min: '9', max: '5' })).toEqual({ ok: false, error: 'The lowest value is above the highest.' });
  });
  it('refuses a key that is taken', () => {
    expect(checkQuestion({ ...base, key: 'goal' }, ['goal'])).toEqual({ ok: false, error: '“goal” is already a question.' });
  });
});

describe('slug', () => {
  it('lowercases and joins with underscores', () => {
    expect(slug(' Hello, World! ')).toBe('hello_world');
  });
});
