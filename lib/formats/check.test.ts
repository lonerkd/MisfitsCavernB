import { describe, expect, it } from 'vitest';
import { checkFormat, type FormatInput } from './check';

const base: FormatInput = { name: ' Live  Event ', blurb: 'A one-night show.', icon: 'sparkles', script_format: 'treatment', skip_phases: ['post-production'] };

describe('checkFormat', () => {
  it('accepts a good format, tidied', () => {
    expect(checkFormat(base)).toEqual({ ok: true, value: { ...base, name: 'Live Event', approval_gates: [] } });
  });
  it('says what is wrong, in words', () => {
    expect(checkFormat({ ...base, name: ' ' })).toEqual({ ok: false, error: 'Give the format a name.' });
    expect(checkFormat({ ...base, name: 'x'.repeat(41) })).toMatchObject({ ok: false });
    expect(checkFormat({ ...base, blurb: 'x'.repeat(141) })).toEqual({ ok: false, error: 'Keep the one-line description under 140 characters.' });
    expect(checkFormat({ ...base, icon: 'rocket' as never })).toEqual({ ok: false, error: 'Pick an icon and a script format.' });
  });
  it('refuses a duplicate name, ignoring case', () => {
    expect(checkFormat({ ...base, name: 'feature' }, ['Feature', 'Series'])).toEqual({ ok: false, error: '“feature” is already a format.' });
  });
  it('keeps only the phases a format may skip, once each', () => {
    const r = checkFormat({ ...base, skip_phases: ['production', 'production', 'pre-production', 'delivery' as never] });
    expect(r).toMatchObject({ ok: true, value: { skip_phases: ['pre-production', 'production'] } });
  });
});

describe('approval gates', () => {
  it('keeps gates in phase order and drops duplicates and unknown phases', () => {
    const r = checkFormat({ ...base, skip_phases: [], approval_gates: ['production', 'pre-production', 'production', 'delivery' as never] });
    expect(r).toMatchObject({ ok: true, value: { approval_gates: ['pre-production', 'production'] } });
  });
  it('drops a gate on a phase the format skips, since it would never be reached', () => {
    const r = checkFormat({ ...base, skip_phases: ['production'], approval_gates: ['production', 'pre-production'] });
    expect(r).toMatchObject({ ok: true, value: { approval_gates: ['pre-production'] } });
  });
  it('no gates by default', () => {
    expect(checkFormat(base)).toMatchObject({ ok: true, value: { approval_gates: [] } });
  });
});
