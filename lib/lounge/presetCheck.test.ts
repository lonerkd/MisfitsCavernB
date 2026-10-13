import { describe, expect, it } from 'vitest';
import { checkPreset, presetKey } from './presetCheck';

const base = { name: 'Sound & Music', type: 'text', audience: 'team', post_policy: 'viewers', phase: 'post-production', topic: 'Mix notes.', why: 'The mix gets its own room.' } as const;

describe('presetKey', () => {
  it('writes a name the way the Lounge does', () => {
    expect(presetKey('Sound & Music!')).toBe('sound-music');
    expect(presetKey('  Dailies  ')).toBe('dailies');
  });
});

describe('checkPreset', () => {
  it('accepts a good suggestion, with the name made into the channel name', () => {
    expect(checkPreset(base)).toEqual({ ok: true, value: { key: 'sound-music', name: 'sound-music', type: 'text', audience: 'team', post_policy: 'viewers', phase: 'post-production', topic: 'Mix notes.', why: 'The mix gets its own room.' } });
  });
  it('says what is wrong, in words', () => {
    expect(checkPreset({ ...base, name: ' ' })).toEqual({ ok: false, error: 'Give the channel a name.' });
    expect(checkPreset({ ...base, name: '123' })).toMatchObject({ ok: false });
    expect(checkPreset({ ...base, why: ' ' })).toEqual({ ok: false, error: 'Say why a production wants this channel — one line.' });
    expect(checkPreset({ ...base, topic: 'x'.repeat(201) })).toMatchObject({ ok: false });
    expect(checkPreset({ ...base, phase: 'nonsense' as never })).toEqual({ ok: false, error: 'Pick a type, an audience, who can post and a phase.' });
  });
  it('refuses a name that is already a suggestion', () => {
    expect(checkPreset(base, ['sound-music'])).toEqual({ ok: false, error: 'There is already a suggestion called “sound-music”.' });
  });
});
