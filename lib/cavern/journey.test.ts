import { describe, expect, it } from 'vitest';
import { makeCave, MIN_CLEARANCE, seedOf } from './cave';
import {
  describeSync, hexToRgb, journeyFromScenes, journeyLength, journeyPace, journeyTarget, journeyTint, journeyZones, MIN_SECTION_X, moodZone,
  needsResync, originFor, RESYNC_DISTANCE, sectionAt, songFraction, type Journey,
} from './journey';
import { newRunner, stepRunner, NO_INPUT } from './runner';

const scene = (n: number, extra: Partial<{ est_duration: string | null; read_seconds: number | null; time_of_day: string | null }> = {}) => ({
  id: `s${n}`, scene_number: n, heading: `INT. PLACE ${n} - DAY`, time_of_day: null, est_duration: null, read_seconds: null, ...extra,
});
const SCRIPT = [
  'INT. WAREHOUSE - NIGHT', '', 'Blood on the floor. A dead body. She screams.', '',
  'EXT. STREET - DAY', '', 'A car chase. Guns fire. He runs and crashes.', '',
  'INT. HOUSE - DAY', '', 'They kiss and dance. Love.', '',
].join('\n');
const scenes = [scene(1, { read_seconds: 60 }), scene(2, { read_seconds: 120 }), scene(3, { read_seconds: 60 })];

describe('the journey from a project', () => {
  it('has nothing without scenes', () => expect(journeyFromScenes([], SCRIPT)).toBeNull());

  it('is one section per scene, in order, touching, as wide as the scene is long', () => {
    const j = journeyFromScenes(scenes, SCRIPT)!;
    expect(j.sections.map((s) => s.number)).toEqual([1, 2, 3]);
    expect(j.sections[0].from).toBe(0);
    expect(j.sections[2].to).toBeCloseTo(1, 9);
    j.sections.forEach((s, i) => { if (i) expect(s.from).toBeCloseTo(j.sections[i - 1].to, 9); });
    expect(j.sections[1].to - j.sections[1].from).toBeCloseTo(0.5, 6); // 2 of 4 minutes
  });

  it('reads each scene’s mood from the script and shapes the cave by it', () => {
    const j = journeyFromScenes(scenes, SCRIPT)!;
    expect(j.sections.map((s) => s.mood)).toEqual(['Dread', 'Action', 'Romance']);
    expect(j.sections.map((s) => s.zone)).toEqual(['crawl', 'teeth', 'chamber']);
  });

  it('is deterministic and a project with no script text still has a quiet journey', () => {
    expect(journeyFromScenes(scenes, SCRIPT)).toEqual(journeyFromScenes(scenes, SCRIPT));
    const quiet = journeyFromScenes(scenes, null)!;
    expect(quiet.sections.every((s) => s.mood === 'Quiet' && s.zone === 'tunnel')).toBe(true);
  });

  it('changes its key when a mood or a length changes, and not otherwise', () => {
    const a = journeyFromScenes(scenes, SCRIPT)!;
    expect(journeyFromScenes(scenes, SCRIPT)!.key).toBe(a.key);
    expect(journeyFromScenes([scene(1, { read_seconds: 90 }), scenes[1], scenes[2]], SCRIPT)!.key).not.toBe(a.key);
    expect(journeyFromScenes(scenes, null)!.key).not.toBe(a.key);
  });
});

describe('where the song is in the journey', () => {
  const j = journeyFromScenes(scenes, SCRIPT)!;
  it('is the song’s fraction, clamped, and unknown without a length', () => {
    expect(songFraction(90_000, 180_000)).toBe(0.5);
    expect(songFraction(-5, 100)).toBe(0);
    expect(songFraction(500, 100)).toBe(1);
    expect(songFraction(10, 0)).toBeNull();
  });
  it('finds the scene a fraction falls in, and how far through it', () => {
    expect(sectionAt(j, 0).section.number).toBe(1);
    expect(sectionAt(j, 0.3).section.number).toBe(2);
    const mid = sectionAt(j, 0.5);
    expect(mid.section.number).toBe(2);
    expect(mid.into).toBeCloseTo(0.5, 6);
    expect(sectionAt(j, 1).section.number).toBe(3); // the end is in the last scene
    expect(sectionAt(j, 9).section.number).toBe(3);
  });
  it('lays the sections along the cave from the origin, and the target follows the song', () => {
    const length = journeyLength(j, 240_000);
    const zones = journeyZones(j, length, 100);
    expect(zones[0].start).toBe(100);
    expect(zones[2].end).toBeCloseTo(100 + length, 6);
    expect(journeyTarget(0.5, length, 100)).toBeCloseTo(100 + length / 2, 9);
    expect(originFor(140, 0.25, length)).toBeCloseTo(140 - length / 4, 9);
    expect(journeyTarget(0.25, length, originFor(140, 0.25, length))).toBeCloseTo(140, 9);
  });
  it('never gives a scene less cave than a floor, even on a very short song', () => {
    expect(journeyLength(j, 1000)).toBe(3 * MIN_SECTION_X);
  });
});

describe('the cave shaped by a journey', () => {
  const j = journeyFromScenes(scenes, SCRIPT)!;
  const length = journeyLength(j, 240_000);
  const zones = journeyZones(j, length, 0);
  const cave = makeCave(seedOf('song'), zones);
  const xs = Array.from({ length: 3000 }, (_, i) => -30 + i * ((length + 60) / 3000));

  it('is the same cave for the same song and journey', () => {
    const again = makeCave(seedOf('song'), journeyZones(j, length, 0));
    expect(xs.every((x) => cave.floorAt(x) === again.floorAt(x) && cave.ceilingAt(x) === again.ceilingAt(x))).toBe(true);
  });
  it('is each scene’s kind of place inside it', () => {
    const mid = (i: number) => (zones[i].start + zones[i].end) / 2;
    expect([0, 1, 2].map((i) => cave.zoneAt(mid(i)))).toEqual(['crawl', 'teeth', 'chamber']);
    expect(cave.zoneAt(-500)).toBe('crawl'); // before the song, the first scene's place
    expect(cave.zoneAt(length + 500)).toBe('chamber'); // after it, the last
  });
  it('is a dread crawl low and a wonder chamber high: the gap follows the mood', () => {
    const gap = (x: number) => cave.floorAt(x) - cave.ceilingAt(x);
    const crawl = gap(zones[0].start + (zones[0].end - zones[0].start) / 2);
    const chamber = gap(zones[2].start + (zones[2].end - zones[2].start) / 2);
    expect(chamber).toBeGreaterThan(crawl + 0.2);
  });
  it('always leaves room to run and has no cliffs, whatever the sections', () => {
    let worst = 0;
    for (let i = 0; i < xs.length; i++) {
      expect(cave.floorAt(xs[i]) - cave.ceilingAt(xs[i])).toBeGreaterThanOrEqual(MIN_CLEARANCE - 1e-9);
      if (i) worst = Math.max(worst, Math.abs(cave.floorAt(xs[i]) - cave.floorAt(xs[i - 1])) / (xs[i] - xs[i - 1]));
    }
    expect(worst).toBeLessThan(2.5);
  });
  it('copes with a one-screen scene between long ones (the blend shrinks to a third of it)', () => {
    const tiny = [{ start: 0, end: 20, kind: 'chamber' as const }, { start: 20, end: 21, kind: 'crawl' as const }, { start: 21, end: 40, kind: 'teeth' as const }];
    const c = makeCave(7, tiny);
    for (let x = 15; x < 26; x += 0.01) {
      expect(Number.isFinite(c.floorAt(x))).toBe(true);
      expect(c.floorAt(x) - c.ceilingAt(x)).toBeGreaterThanOrEqual(MIN_CLEARANCE - 1e-9);
    }
  });
  it('without zones is exactly the seeded cave it always was', () => {
    const a = makeCave(seedOf('x')), b = makeCave(seedOf('x'), []);
    expect(xs.every((x) => a.floorAt(x) === b.floorAt(x) && a.ceilingAt(x) === b.ceilingAt(x))).toBe(true);
  });
});

describe('the light and the pace', () => {
  const j = journeyFromScenes(scenes, SCRIPT)!;
  const cover: [number, number, number] = [200, 100, 50];
  it('is the scene’s mood over the cover’s, and changes as the song moves between moods', () => {
    const dread = journeyTint(j, 0.05, cover), romance = journeyTint(j, 0.95, cover);
    expect(dread).not.toEqual(romance);
    expect(journeyTint(j, 0.05, cover)).toEqual(dread);
    expect(journeyTint(j, 0.05, [10, 10, 10])).not.toEqual(dread); // the cover still shows through
  });
  it('eases across a boundary instead of switching', () => {
    const b = j.sections[0].to;
    const before = journeyTint(j, b - 0.001, cover), after = journeyTint(j, b + 0.001, cover);
    expect(Math.max(...before.map((v, i) => Math.abs(v - after[i])))).toBeLessThan(12);
  });
  it('hurries to catch the song, waits for it, and is its own pace in step', () => {
    expect(journeyPace(10, 10)).toBe(1);
    expect(journeyPace(10, 12)).toBeGreaterThan(1);
    expect(journeyPace(10, 40)).toBe(1.7);
    expect(journeyPace(10, 8)).toBeLessThan(1);
    expect(journeyPace(40, 10)).toBe(0.55);
  });
  it('asks to be rebuilt only when far from where the song says', () => {
    expect(needsResync(0, RESYNC_DISTANCE - 1)).toBe(false);
    expect(needsResync(0, RESYNC_DISTANCE + 1)).toBe(true);
    expect(needsResync(30, 10)).toBe(true);
  });
  it('really moves the runner: a higher pace covers more ground, a lower one less', () => {
    const cave = makeCave(5);
    const run = (pace?: number) => { let r = newRunner(cave, 0); for (let i = 0; i < 120; i++) r = stepRunner(r, 1 / 30, NO_INPUT, cave, true, pace); return r.x; };
    expect(run(1.5)).toBeGreaterThan(run(1));
    expect(run(0.6)).toBeLessThan(run(1));
    expect(run(1)).toBeCloseTo(run(), 12);
  });
});

describe('moods and colours', () => {
  it('maps every mood the reader knows to a place, and a stranger to a tunnel', () => {
    for (const m of ['Action', 'Dread', 'Suspense', 'Grief', 'Romance', 'Neon', 'Wonder', 'Comedy', 'Night', 'Dawn', 'Dusk', 'Quiet']) expect(['tunnel', 'chamber', 'crawl', 'teeth']).toContain(moodZone(m));
    expect(moodZone('Something else')).toBe('tunnel');
  });
  it('reads a hex colour, and a bad one is the quiet slate', () => {
    expect(hexToRgb('#8b0000')).toEqual([139, 0, 0]);
    expect(hexToRgb('ff4500')).toEqual([255, 69, 0]);
    expect(hexToRgb('nope')).toEqual([100, 116, 139]);
  });
});

describe('the honest label', () => {
  const j: Journey = journeyFromScenes(scenes, SCRIPT)!;
  const base = { status: 'ready' as const, journey: j, durationKnown: true, fraction: 0.5, listening: false };
  it('says it follows the project, which scene, and that the song is not the cut, when the journey is on', () => {
    const r = describeSync(base);
    expect(r.levels).toEqual([1, 3]);
    expect(r.text).toContain('scene 2 of 3');
    expect(r.text).toContain('Action');
    expect(r.text).toContain('not your cut');
  });
  it('adds level 2 only when it is listening', () => expect(describeSync({ ...base, listening: true }).levels).toEqual([1, 2, 3]));
  it('says plainly why the project level is off', () => {
    expect(describeSync({ ...base, status: 'no-project', journey: null, fraction: null })).toEqual({ levels: [1], text: 'No project open: the cave follows the player only.' });
    expect(describeSync({ ...base, status: 'no-scenes', journey: null, fraction: null }).text).toContain('no scenes');
    expect(describeSync({ ...base, status: 'failed', journey: null, fraction: null }).text).toContain('Could not read');
    expect(describeSync({ ...base, status: 'loading', journey: null, fraction: null }).text).toContain('Reading');
    const noLength = describeSync({ ...base, durationKnown: false, fraction: null });
    expect(noLength.levels).toEqual([1]);
    expect(noLength.text).toContain('length is not known');
  });
});
