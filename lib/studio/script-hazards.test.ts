import { describe, expect, it } from 'vitest';
import { placeOfHeading, scanScene } from './script-hazards';

const L = (type: string, text: string) => ({ type, text });

describe('script hazards', () => {
  it('finds what the action says, once each, most serious first', () => {
    const h = scanScene([L('scene_heading', 'EXT. HARBOUR - NIGHT'), L('action', 'MAYA fires the gun. Flames lick the boat.'), L('action', 'A second gunshot.')]);
    expect(h.map((x) => x.kind)).toEqual(['fire', 'weapons', 'water', 'night']);
    expect(h[1].evidence).toMatch(/gun/);
  });
  it('reads the heading for a night exterior, not an interior', () => {
    expect(scanScene([L('scene_heading', 'INT. KITCHEN - NIGHT'), L('action', 'She sets a cup down.')])).toEqual([]);
    expect(scanScene([L('scene_heading', 'EXT. LANE - DUSK')]).map((x) => x.kind)).toEqual(['night']);
  });
  it('ignores dialogue and character cues', () => {
    expect(scanScene([L('scene_heading', 'INT. BAR - DAY'), L('character', 'FIRE'), L('dialogue', 'I will shoot you a message.')])).toEqual([]);
  });
  it('names the place from a heading', () => {
    expect(placeOfHeading('INT. OLD KITCHEN - NIGHT')).toBe('OLD KITCHEN');
    expect(placeOfHeading('12 EXT. THE QUAY - DAY')).toBe('THE QUAY');
    expect(placeOfHeading('I/E. CAR - MOVING')).toBe('CAR');
  });
});
