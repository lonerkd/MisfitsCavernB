import { describe, expect, it } from 'vitest';
import { dayExposure, weatherAdvice } from './weather-plan';

const sc = (n: number, heading: string, day: number | null) => ({ scene_number: n, heading, shoot_day: day });
const scenes = [sc(1, 'INT. KITCHEN - DAY', 1), sc(2, 'EXT. QUAY - NIGHT', 1), sc(3, 'EXT. QUAY - DAY', 1), sc(4, '4 INT./EXT. CAR - DAY', 2), sc(5, 'INT. BAR - DAY', 2), sc(6, 'EXT. ROOF - DAY', null)];

describe('weather plan', () => {
  it('splits a day into exteriors, interiors and night exteriors, and ignores other days', () => {
    expect(dayExposure(scenes, 1)).toEqual({ exterior: [2, 3], interior: [1], night: [2] });
    expect(dayExposure(scenes, 2)).toEqual({ exterior: [4], interior: [5], night: [] });
    expect(dayExposure(scenes, 9)).toEqual({ exterior: [], interior: [], night: [] });
  });
  it('bad weather only matters on exteriors, and names the cover', () => {
    expect(weatherAdvice(dayExposure([sc(5, 'INT. BAR - DAY', 2)], 2), true)).toMatch(/interior day/i);
    expect(weatherAdvice(dayExposure(scenes, 1), true)).toMatch(/at risk.*shoot 1 indoors first/);
    expect(weatherAdvice(dayExposure([sc(3, 'EXT. QUAY - DAY', 1)], 1), true)).toMatch(/nothing indoors/);
    expect(weatherAdvice(dayExposure(scenes, 1), false)).toMatch(/night: 2/);
    expect(weatherAdvice(dayExposure([], 1), true)).toMatch(/nothing to affect/);
  });
});
