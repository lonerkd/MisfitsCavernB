import { describe, it, expect } from 'vitest';
import { allTags, buildLibrary, filterLibrary, NO_FILTER } from './library';
import type { AudioReference, SfxAsset } from '@/lib/supabase/audio';

const ref = (o: Partial<AudioReference>): AudioReference => ({ id: 'r', project_id: 'p', added_by: 'u', reference_type: 'spotify', uri: 'spotify:track:1', title: 'Theme', description: 'Ada', created_at: null, for_scene: null, role: null, tags: [], ...o } as AudioReference);
const sfx = (o: Partial<SfxAsset>): SfxAsset => ({ id: 's', project_id: 'p', user_id: 'u', title: 'door.wav', audio_url: 'https://x/door.wav', tags: ['Cavern Created'], duration: null, created_at: null, ...o } as SfxAsset);

describe('the Sound library', () => {
  const items = buildLibrary(
    [ref({ id: 'a', title: 'Theme', role: 'theme', for_scene: 'sc1', tags: ['Tense', 'strings'] }), ref({ id: 'b', title: 'Rain', reference_type: 'custom_upload', uri: 'https://x/rain.wav', tags: ['tense'] }), ref({ id: 'c', title: 'Radio', tags: [] })],
    [sfx({ id: '1', title: 'rain.wav', audio_url: 'https://x/rain.wav' }), sfx({ id: '2', title: 'door.wav' })],
  );

  it('lists references first, then uploads not already saved as a reference', () => {
    expect(items.map((i) => i.key)).toEqual(['ref:a', 'ref:b', 'ref:c', 'sfx:2']);
    expect(items.find((i) => i.key === 'sfx:2')).toMatchObject({ kind: 'sound', refId: null });
  });

  it('filters by kind, role and scene (including "none")', () => {
    expect(filterLibrary(items, { ...NO_FILTER, kind: 'song' }).map((i) => i.key)).toEqual(['ref:a', 'ref:c']);
    expect(filterLibrary(items, { ...NO_FILTER, role: 'theme' }).map((i) => i.key)).toEqual(['ref:a']);
    expect(filterLibrary(items, { ...NO_FILTER, role: 'none' }).map((i) => i.key)).toEqual(['ref:b', 'ref:c', 'sfx:2']);
    expect(filterLibrary(items, { ...NO_FILTER, scene: 'sc1' }).map((i) => i.key)).toEqual(['ref:a']);
    expect(filterLibrary(items, { ...NO_FILTER, scene: 'none' }).map((i) => i.key)).toEqual(['ref:b', 'ref:c', 'sfx:2']);
  });

  it('filters by tag (case aside) and by text over title, subtitle and tags', () => {
    expect(filterLibrary(items, { ...NO_FILTER, tag: 'tense' }).map((i) => i.key)).toEqual(['ref:a', 'ref:b']);
    expect(filterLibrary(items, { ...NO_FILTER, text: 'STRINGS' }).map((i) => i.key)).toEqual(['ref:a']);
    expect(filterLibrary(items, { ...NO_FILTER, text: 'zzz' })).toEqual([]);
  });

  it('lists the tags in use, most used first', () => {
    expect(allTags(items)).toEqual(['Tense', 'strings']);
  });
});
