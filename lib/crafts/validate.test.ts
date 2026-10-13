import { describe, expect, it } from 'vitest';
import { checkCraft } from './validate';

describe('checkCraft', () => {
  it('accepts a good craft, tidied', () => {
    expect(checkCraft({ name: '  Boom   operator ', department: ' Sound ', color: '#E8431A' })).toEqual({ ok: true, value: { name: 'Boom operator', department: 'Sound', color: '#e8431a', above_the_line: false } });
    expect(checkCraft({ name: 'Writer', department: 'Story', color: '#336467', above_the_line: true })).toMatchObject({ ok: true, value: { above_the_line: true } });
  });
  it('says what is wrong, in words', () => {
    expect(checkCraft({ name: ' ', department: 'Sound', color: '#e8431a' })).toEqual({ ok: false, error: 'Give the craft a name.' });
    expect(checkCraft({ name: 'x'.repeat(41), department: 'Sound', color: '#e8431a' })).toMatchObject({ ok: false });
    expect(checkCraft({ name: 'Boom', department: '', color: '#e8431a' })).toEqual({ ok: false, error: 'Pick or type a department.' });
    expect(checkCraft({ name: 'Boom', department: 'Sound', color: 'red' })).toEqual({ ok: false, error: 'Colour must be a hex value like #e8431a.' });
  });
  it('refuses a duplicate, ignoring case', () => {
    expect(checkCraft({ name: 'gaffer', department: 'Lighting', color: '#e8431a' }, ['Gaffer', 'Grip'])).toEqual({ ok: false, error: '“gaffer” is already a craft.' });
  });
});
