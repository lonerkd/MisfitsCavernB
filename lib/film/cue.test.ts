import { describe, expect, it } from 'vitest';
import { cueCard, cueCardLabel } from './cue';

const characters = [{ id: 'c1', name: 'MAYA' }, { id: 'c2', name: 'LEO' }];
const states = [{ scene_id: 's1', character_id: 'c1', look: ' Red coat ' }, { scene_id: 's2', character_id: 'c1', look: 'Blue coat' }];
const base = { sceneId: 's1', actor: 'Ana', stats: { dialogueLines: 12, sceneAppearances: 5 }, characters, states };

describe('cueCard', () => {
  it('collects the actor, the look in this scene and the counts', () => {
    expect(cueCard({ ...base, cue: 'MAYA' })).toEqual({ name: 'MAYA', actor: 'Ana', look: 'Red coat', speeches: 12, scenes: 5 });
  });
  it('reads a cue with an extension, in any case', () => {
    expect(cueCard({ ...base, cue: "maya (V.O.)" })?.name).toBe('MAYA');
  });
  it('takes the look of this scene, not another', () => {
    expect(cueCard({ ...base, cue: 'MAYA', sceneId: 's2' })?.look).toBe('Blue coat');
    expect(cueCard({ ...base, cue: 'MAYA', sceneId: 's9' })?.look).toBeNull();
  });
  it('says nothing it does not know: no actor, no look, a character not yet a row, no stats', () => {
    expect(cueCard({ ...base, cue: 'LEO', actor: undefined, stats: undefined })).toEqual({ name: 'LEO', actor: null, look: null, speeches: null, scenes: null });
    expect(cueCard({ ...base, cue: 'ZED', sceneId: null })?.look).toBeNull();
  });
  it('is null for a line that names no one', () => {
    expect(cueCard({ ...base, cue: '  (V.O.)  ' })).toBeNull();
  });
});

describe('cueCardLabel', () => {
  it('reads as one sentence', () => {
    expect(cueCardLabel({ name: 'MAYA', actor: 'Ana', look: 'Red coat', speeches: 1, scenes: 5 }))
      .toBe('MAYA, played by Ana, look in this scene: Red coat, 1 speech, 5 scenes');
    expect(cueCardLabel({ name: 'LEO', actor: null, look: null, speeches: null, scenes: null })).toBe('LEO, not cast yet, no look written for this scene');
  });
});
