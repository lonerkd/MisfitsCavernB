import { describe, it, expect } from 'vitest';
import { SHOT_SIZES, describeCamera, sizeOf, viewBoxFor } from './framing';

describe('shot sizes', () => {
  it('read stored values in any case or common spelling', () => {
    expect(sizeOf('mcu')?.id).toBe('MCU');
    expect(sizeOf('Wide')?.id).toBe('WS');
    expect(sizeOf(' close-up ')?.id).toBe('CU');
    expect(sizeOf('two-shot')?.id).toBe('2S');
    expect(sizeOf('banana')).toBeNull();
    expect(sizeOf(null)).toBeNull();
  });

  it('each frames a 16:9 window, tighter as the size gets closer', () => {
    const heights = ['EWS', 'WS', 'FS', 'MS', 'MCU', 'CU', 'ECU'].map((id) => SHOT_SIZES.find((s) => s.id === id)!.window.h);
    expect([...heights].sort((a, b) => b - a)).toEqual(heights);
    const [, , w, h] = viewBoxFor(sizeOf('CU')).split(' ').map(Number);
    expect(w / h).toBeCloseTo(16 / 9, 2);
    expect(viewBoxFor(null)).toBe(viewBoxFor(sizeOf('WS')));
  });

  it('describes the camera in one line', () => {
    expect(describeCamera({ shot_size: 'mcu', angle: 'low', movement: 'dolly', lens: '35mm' })).toBe('MCU · Low · Dolly · 35mm');
    expect(describeCamera({ shot_size: null, angle: null, movement: 'static', lens: ' ' })).toBe('Static');
  });
});
