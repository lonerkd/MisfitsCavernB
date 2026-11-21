import { describe, it, expect } from 'vitest';
import { timelineScale, axisWidth, buildTimeline, centredScrollLeft, formatMinutes, minimapSegments, MIN_AXIS_PX, MIN_SCENE_MINUTES, sceneLength, sceneSummary, stripToScrollLeft, viewWindow, type TimelineSceneInput, type TimelineTrackInput } from './timeline';

const sc = (n: number, o: Partial<TimelineSceneInput> = {}): TimelineSceneInput => ({ id: `s${n}`, scene_number: n, heading: `INT. ROOM ${n} - DAY`, time_of_day: 'DAY', est_duration: null, read_seconds: null, ...o });
const tr = (id: string, scene: string | null, o: Partial<TimelineTrackInput> = {}): TimelineTrackInput => ({ id, title: id, uri: `spotify:track:${id}`, for_scene: scene, role: null, tags: [], ...o });

describe('a scene’s length', () => {
  it('trusts the table read, then page eighths at a page a minute, then lines, then a floor', () => {
    expect(sceneLength({ est_duration: '8/8', read_seconds: 90 })).toEqual({ minutes: 1.5, source: 'read' });
    expect(sceneLength({ est_duration: '16/8', read_seconds: null })).toEqual({ minutes: 2, source: 'pages' });
    expect(sceneLength({ est_duration: null, read_seconds: null }, 110)).toEqual({ minutes: 2, source: 'lines' });
    expect(sceneLength({ est_duration: null, read_seconds: null })).toEqual({ minutes: MIN_SCENE_MINUTES, source: 'floor' });
  });
  it('keeps a tiny scene visible', () => {
    expect(sceneLength({ est_duration: '1/8', read_seconds: null }).minutes).toBe(MIN_SCENE_MINUTES);
  });
});

describe('the timeline', () => {
  const scenes = [sc(2, { est_duration: '8/8' }), sc(1, { est_duration: '16/8' }), sc(3, { est_duration: '8/8' })];

  it('puts the scenes in order and lays them end to end', () => {
    const t = buildTimeline({ scenes, tracks: [] });
    expect(t.scenes.map((s) => [s.number, s.start, s.minutes])).toEqual([[1, 0, 2], [2, 2, 1], [3, 3, 1]]);
    expect(t.totalMinutes).toBe(4);
  });

  it('takes each scene’s mood and colour, or says Quiet', () => {
    const t = buildTimeline({ scenes, tracks: [], moods: new Map([[1, { mood: 'Dread', color: '#8b0000' }]]) });
    expect(t.scenes[0]).toMatchObject({ mood: 'Dread', color: '#8b0000' });
    expect(t.scenes[1].mood).toBe('Quiet');
  });

  it('makes a lane per role in a fixed order, and draws the scenes with no music as gaps', () => {
    const t = buildTimeline({ scenes, tracks: [tr('a', 's1', { role: 'temp' }), tr('b', 's2', { role: 'theme' }), tr('c', 's2')] });
    expect(t.lanes.map((l) => l.role)).toEqual(['theme', 'temp', 'none']);
    expect(t.gaps.map((g) => g.number)).toEqual([3]);
    expect(t.scenes.map((s) => s.silent)).toEqual([false, false, true]);
  });

  it('gives a song that returns in several scenes the same swatch', () => {
    const t = buildTimeline({ scenes, tracks: [tr('a', 's1', { uri: 'spotify:track:x', role: 'theme' }), tr('a2', 's3', { uri: 'spotify:track:x', role: 'theme' }), tr('b', 's2', { uri: 'spotify:track:y', role: 'theme' })] });
    const bars = t.lanes[0].bars;
    expect(bars[0].swatch).toBe(bars[1].swatch);
    expect(bars[2].swatch).not.toBe(bars[0].swatch);
  });

  it('counts tracks tagged to a scene that is not in this script, and ignores untagged ones', () => {
    const t = buildTimeline({ scenes, tracks: [tr('a', 'other-script-scene'), tr('b', null)] });
    expect(t.elsewhere).toBe(1);
    expect(t.lanes).toEqual([]);
    expect(t.gaps).toHaveLength(3);
  });

  it('copes with a script that has no scenes', () => {
    expect(buildTimeline({ scenes: [], tracks: [] })).toEqual({ scenes: [], lanes: [], totalMinutes: 0, gaps: [], elsewhere: 0 });
  });
});

describe('words for a scene', () => {
  it('formats minutes and names a block', () => {
    expect(formatMinutes(0.5)).toBe('30 s');
    expect(formatMinutes(2.25)).toBe('2:15');
    const t = buildTimeline({ scenes: [sc(1, { est_duration: '16/8' }), sc(2)], tracks: [tr('a', 's1')] });
    expect(sceneSummary(t.scenes[0], 1)).toBe('Scene 1, Quiet, 2:00, 1 track');
    expect(sceneSummary(t.scenes[1], 0)).toBe('Scene 2, Quiet, 0:24 (length not known), no music'.replace('0:24', '24 s'));
  });
});

describe('the minimap and the scroll position', () => {
  it('draws the axis at least as wide as the box, and longer at a higher zoom', () => {
    expect(axisWidth(3, 16)).toBe(MIN_AXIS_PX);
    expect(axisWidth(30, 16)).toBe(480);
    expect(axisWidth(30, 32)).toBe(960);
  });

  it('places each minimap block where the timeline draws that scene (same scale, as percentages)', () => {
    const t = buildTimeline({ scenes: [sc(1, { est_duration: '16/8' }), sc(2, { est_duration: '8/8' })], tracks: [] });
    const axis = axisWidth(t.totalMinutes, 16); // 3 min * 16 = 48 px, so the 320 px floor applies
    const segs = minimapSegments(t.scenes, 16, axis);
    expect(segs.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(segs[0].leftPct).toBeCloseTo(0);
    expect(segs[0].widthPct).toBeCloseTo((2 * 16 / 320) * 100);
    expect(segs[1].leftPct).toBeCloseTo((2 * 16 / 320) * 100);
    // On a wider axis the script covers its own share of the strip: 3 min * 16 px of 480 px.
    const wide = minimapSegments(t.scenes, 16, 480);
    expect(wide[0].widthPct + wide[1].widthPct).toBeCloseTo((3 * 16 / 480) * 100);
  });

  it('centres a point in the box, and clamps at either end of the axis', () => {
    expect(centredScrollLeft(200, 100, 1000)).toBe(150);
    expect(centredScrollLeft(10, 100, 1000)).toBe(0);
    expect(centredScrollLeft(990, 100, 1000)).toBe(900);
    expect(centredScrollLeft(50, 400, 320)).toBe(0); // a box wider than the axis never scrolls
  });

  it('maps a press on the strip to the scrollLeft that centres that point', () => {
    // A 400 px strip over a 1000 px axis: the middle of the strip is the middle of the script.
    expect(stripToScrollLeft(200, 400, 100, 1000)).toBe(450);
    expect(stripToScrollLeft(0, 400, 100, 1000)).toBe(0);
    expect(stripToScrollLeft(400, 400, 100, 1000)).toBe(900);
    expect(stripToScrollLeft(-30, 400, 100, 1000)).toBe(0); // outside the strip is clamped
    expect(stripToScrollLeft(10, 0, 100, 1000)).toBe(0); // an unmeasured strip does nothing
  });

  it('turns the part in view into the highlight window, in percentages of the strip', () => {
    expect(viewWindow(250, 100, 1000)).toEqual({ leftPct: 25, widthPct: 10 });
    expect(viewWindow(950, 100, 1000)).toEqual({ leftPct: 90, widthPct: 10 }); // never past the end
    expect(viewWindow(0, 2000, 1000)).toEqual({ leftPct: 0, widthPct: 100 }); // the whole script fits
    expect(viewWindow(0, 0, 0)).toEqual({ leftPct: 0, widthPct: 100 });
  });
});

describe('timelineScale', () => {
  it('is the zoom scale on a desktop', () => {
    expect(timelineScale(0.5, false, 0.4)).toBe(8);
    expect(timelineScale(2, false, 0.4)).toBe(32);
  });
  it('never lets the shortest scene fall under 44 pt on a phone, whatever the zoom', () => {
    for (const z of [0.5, 0.75, 1, 2, 4]) {
      const px = timelineScale(z, true, 0.4);
      expect(0.4 * px - 2).toBeGreaterThanOrEqual(44);
    }
  });
  it('lets zoom widen it beyond the minimum, and survives bad input', () => {
    expect(timelineScale(4, true, 10)).toBe(64);
    expect(timelineScale(NaN, true, 0)).toBeGreaterThan(0);
  });
});
