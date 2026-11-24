import { describe, expect, it } from 'vitest';
import { planPlaceChange } from './rename-location';

const places = [{ id: 'a', name: 'THE KITCHEN' }, { id: 'b', name: 'KITCHEN' }, { id: 'c', name: 'DOCK' }];

describe('planPlaceChange', () => {
  it('a new name renames the record', () => {
    expect(planPlaceChange(places, 'DOCK', 'HARBOR')).toEqual({ action: 'rename', id: 'c' });
  });
  it('a name the project already has is chosen: the old record is left, not deleted', () => {
    expect(planPlaceChange(places, 'THE KITCHEN', 'KITCHEN')).toEqual({ action: 'choose', existing: 'KITCHEN', leftBehind: 'THE KITCHEN' });
  });
  it('a place with no record yet is a text rewrite only', () => {
    expect(planPlaceChange(places, 'ATTIC', 'LOFT')).toEqual({ action: 'text-only' });
  });
  it('choosing an existing place from one with no record has nothing left behind', () => {
    expect(planPlaceChange(places, 'ATTIC', 'DOCK')).toEqual({ action: 'choose', existing: 'DOCK', leftBehind: null });
  });
  it('spelling and case do not matter', () => {
    expect(planPlaceChange(places, 'dock', 'Harbor').action).toBe('rename');
    expect(planPlaceChange(places, 'ATTIC', 'dock').action).toBe('choose');
  });
});
