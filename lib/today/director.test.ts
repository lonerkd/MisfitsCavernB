import { describe, it, expect } from 'vitest';
import { dayGlance, isCameraCraft, isDirectionCraft, seesDayAtAGlance, type GlanceInput, type GlanceScene } from './director';

const scene = (n: number, extra: Partial<GlanceScene> = {}): GlanceScene => ({ id: `s${n}`, scene_number: n, title: `INT. ROOM ${n} - DAY`, time_of_day: 'DAY', location: 'Room', cast: ['MAYA', 'BEN'], status: 'planned', ...extra });
const base = (extra: Partial<GlanceInput> = {}): GlanceInput => ({
  today: '2026-11-15', day: { day_number: 2, shoot_date: '2026-11-17' }, scenes: [scene(3), scene(1)], shotsByScene: { s1: 2, s3: 1 },
  sheet: { issued_at: '2026-11-14T10:00:00Z', general_call: '07:00', location_address: '12 Pier Rd', weather: null }, crew: 4, acked: 4, ...extra,
});

describe('isDirectionCraft', () => {
  it('is the director and the assistant directors', () => {
    expect(isDirectionCraft('Director')).toBe(true);
    expect(isDirectionCraft('First assistant director')).toBe(true);
    expect(isDirectionCraft('Gaffer')).toBe(false);
    expect(isDirectionCraft(null)).toBe(false);
  });
});

describe('dayGlance', () => {
  it('lists the scenes in order with their shots and cast, and a ready day has nothing to attend to', () => {
    const g = dayGlance(base());
    expect(g.scenes.map((s) => s.scene_number)).toEqual([1, 3]);
    expect(g.scenes[0]).toMatchObject({ shots: 2, cast: ['MAYA', 'BEN'], flags: [] });
    expect(g.shots).toBe(3);
    expect(g.inDays).toBe(2);
    expect(g.attention).toEqual([]);
  });

  it('flags a scene with no shots, no location or no cast, and says how many scenes have no shots', () => {
    const g = dayGlance(base({ scenes: [scene(1), scene(2, { location: ' ', cast: [] })], shotsByScene: { s1: 1 } }));
    expect(g.scenes[1].flags).toEqual(['No shots planned', 'No location', 'No cast listed']);
    expect(g.attention).toEqual(['1 of 2 scenes has no shots planned']);
  });

  it('names an unissued call sheet only when the day is within the week, and louder on the day itself', () => {
    expect(dayGlance(base({ sheet: null })).attention).toEqual(['The call sheet has not been issued']);
    expect(dayGlance(base({ sheet: null, day: { day_number: 2, shoot_date: '2026-11-15' } })).attention).toEqual(['The call sheet has not been issued, and today is the day']);
    expect(dayGlance(base({ sheet: null, day: { day_number: 2, shoot_date: '2026-12-30' } })).attention).toEqual([]);
  });

  it('counts the crew who have not acknowledged an issued call sheet, and nothing before it is issued', () => {
    expect(dayGlance(base({ acked: 1 })).attention).toEqual(['3 of 4 have not acknowledged the call sheet']);
    expect(dayGlance(base({ sheet: null, acked: 0 })).attention).toEqual(['The call sheet has not been issued']);
  });

  it('says so when nothing is scheduled, and survives a day with no date', () => {
    const g = dayGlance(base({ scenes: [], shotsByScene: {}, day: { day_number: 5, shoot_date: null } }));
    expect(g.inDays).toBeNull();
    expect(g.attention).toContain('Nothing is scheduled on this day yet');
  });
});

describe('who sees the day at a glance', () => {
  it('direction and the camera department, not the other crafts', () => {
    for (const c of ['Director', 'First assistant director', 'Director of photography', 'Camera operator', 'First assistant camera', 'DIT']) expect(seesDayAtAGlance(c)).toBe(true);
    for (const c of ['Gaffer', 'Key grip', 'Costume designer', null, undefined, '']) expect(seesDayAtAGlance(c)).toBe(false);
    expect(isCameraCraft('Director')).toBe(false);
  });
});
