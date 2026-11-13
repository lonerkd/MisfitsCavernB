import { describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({
  supabase: {
    storage: {
      from: (bucket: string) => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://db.test/storage/v1/object/public/${bucket}/${path}` } }),
      }),
    },
  },
}));

import { audioRefUrl } from './audio';

describe('audioRefUrl', () => {
  it('plays a saved sound effect from the URL it was saved with', () => {
    const saved = 'https://db.test/storage/v1/object/public/sfx_library/u1/123_door.wav';
    expect(audioRefUrl(saved)).toBe(saved);
  });

  it('resolves a bare storage path in the sfx_library bucket', () => {
    expect(audioRefUrl('u1/123_door.wav')).toBe('https://db.test/storage/v1/object/public/sfx_library/u1/123_door.wav');
  });
});

import { normalizeTags } from './audio';
describe('normalizeTags', () => {
  it('trims, drops empties and repeats (case aside), keeps the first spelling', () => {
    expect(normalizeTags(' tense, Strings ,,TENSE , ')).toEqual(['tense', 'Strings']);
  });
  it('cuts a tag at 40 characters and keeps twelve at most', () => {
    expect(normalizeTags('x'.repeat(60))[0]).toHaveLength(40);
    expect(normalizeTags(Array.from({ length: 20 }, (_, i) => `t${i}`).join(','))).toHaveLength(12);
  });
  it('nothing in, nothing out', () => { expect(normalizeTags('')).toEqual([]); });
});
