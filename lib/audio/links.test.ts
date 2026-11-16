import { describe, expect, it } from 'vitest';
import { editorSceneHref, parseSoundTab, soundHref } from './links';

describe('Sound links', () => {
  it('links a scene to the editor in the format the editor reads', () => {
    expect(editorSceneHref('s1', 'sc2')).toBe('/editor?script=s1&scene=sc2');
    expect(editorSceneHref('s1', null)).toBe('/editor?script=s1');
    expect(editorSceneHref(null, 'sc2')).toBeNull();
  });
  it('links to a tab and reads it back', () => {
    expect(soundHref('scenes')).toBe('/soundtrack?tab=scenes');
    expect(parseSoundTab('library')).toBe('library');
    expect(parseSoundTab('nonsense')).toBe('search');
    expect(parseSoundTab(null, 'scenes')).toBe('scenes');
  });
});
