import { describe, expect, it } from 'vitest';
import { makeCave } from './cave';
import { BEHIND, makeSpores, stepSpores } from './spores';

const cave = makeCave(3);

describe('the specks of light', () => {
  it('start inside the cave, around the camera', () => {
    for (const s of makeSpores(80, cave, 20, 2.5, 1)) {
      expect(s.x).toBeGreaterThanOrEqual(20 - BEHIND); expect(s.x).toBeLessThanOrEqual(22.5);
      expect(s.y).toBeGreaterThan(cave.ceilingAt(s.x)); expect(s.y).toBeLessThan(cave.floorAt(s.x));
    }
  });
  it('are moved ahead once left behind, and always stay inside the cave', () => {
    let spores = makeSpores(80, cave, 0, 2.5, 1);
    let cam = 0;
    for (let i = 0; i < 60 * 40; i++) {
      cam += 0.016;
      spores = stepSpores(spores, cave, cam, 2.5, 1 / 60, 1);
    }
    for (const s of spores) {
      expect(s.x).toBeGreaterThanOrEqual(cam - BEHIND - 0.01);
      expect(s.y).toBeGreaterThanOrEqual(cave.ceilingAt(s.x) - 1e-9); expect(s.y).toBeLessThanOrEqual(cave.floorAt(s.x) + 1e-9);
    }
    expect(spores).toHaveLength(80);
  });
});
