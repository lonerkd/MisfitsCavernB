import { describe, expect, it } from 'vitest';
import { CONTROL_KEYS } from './routes';
import { assignKeys, SLOT_KEYS } from './slots';

describe('assignKeys', () => {
  it('gives a slotted action its slot key wherever it sits', () => {
    expect(assignKeys([{ slot: 'create' }])).toEqual(['q']);
    expect(assignKeys([{}, {}, { slot: 'create' }])).toEqual(['w', 'e', 'q']);
    expect(assignKeys([{ slot: 'find' }, {}, {}])).toEqual(['e', 'q', 'w']);
  });

  it('fills unslotted controls with the keys no slot claimed, in order, as before', () => {
    expect(assignKeys([{}, {}, {}])).toEqual(['q', 'w', 'e']);
  });

  it('lets the first claimant keep a slot key and sends a second to the free keys', () => {
    expect(assignKeys([{ slot: 'create' }, { slot: 'create' }])).toEqual(['q', 'w']);
  });

  it('runs out of keys gracefully', () => {
    const many = Array.from({ length: CONTROL_KEYS.length + 2 }, () => ({}));
    const keys = assignKeys(many);
    expect(keys.slice(-2)).toEqual([undefined, undefined]);
    expect(new Set(keys.filter(Boolean)).size).toBe(CONTROL_KEYS.length);
  });

  it('keeps every slot on a real deck key, one key per slot', () => {
    const keys = Object.values(SLOT_KEYS);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(CONTROL_KEYS as readonly string[]).toContain(k);
  });
});
