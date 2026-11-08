import { describe, expect, it } from 'vitest';
import { parseScript } from './parser';

// The scene's time of day is read with the same separators as its place (hyphens, en and em dashes).
describe('a scene heading with en or em dashes', () => {
  it('has its time of day and its place, as with hyphens', () => {
    const [a, b, c] = ['INT. DOCK OFFICE - HARBOR TOWN - NIGHT', 'INT. DOCK OFFICE – HARBOR TOWN – NIGHT', 'INT. DOCK OFFICE — HARBOR TOWN — NIGHT']
      .map((h) => parseScript(`${h}\n\nRain.\n`).scenes[0]);
    expect(a.timeOfDay).toBe('NIGHT');
    for (const s of [b, c]) { expect(s.timeOfDay).toBe(a.timeOfDay); expect(s.location).toBe(a.location); }
  });
});
