// The cavern's journey: with a project open, the cave moves through the project's scenes in order while the song plays. Each scene is a
// section of cave shaped by its mood (a Dread scene is a low crawl, an Action scene is teeth, a Wonder scene a chamber) and lit in the
// mood's colour, and the song's progress decides where along the journey the cave is. Everything here is pure and deterministic: the
// hook (`useJourney`) loads the scenes, the cavern's loop asks these functions. Plan: .cavern-intelligence/plans/2026-11-08-the-cavern-experience.md
import { buildTimeline, type TimelineSceneInput } from '../audio/timeline';
import { parseScript } from '../scriptos/parser';
import { sceneMood } from '../spotify/moods';
import type { ZoneKind, ZoneSegment } from './cave';
import { asLight, type Rgb } from './palette';
import { CRUISE } from './runner';

export interface JourneySection {
  /** The scene's number in the script. */
  number: number;
  heading: string;
  mood: string;
  color: Rgb;
  zone: ZoneKind;
  /** Where it sits along the journey, 0 to 1 (by the scene's length). */
  from: number;
  to: number;
}

export interface Journey {
  sections: JourneySection[];
  /** Changes whenever the cave this journey makes would change, so the loop knows when to build it again. */
  key: string;
}

/** The kind of place a mood makes. The scene's own mood from `lib/spotify/moods.ts`; a mood it does not know is a plain tunnel. */
const ZONE_OF: Record<string, ZoneKind> = {
  Action: 'teeth', Neon: 'teeth', Comedy: 'chamber',
  Dread: 'crawl', Suspense: 'crawl', Grief: 'crawl',
  Romance: 'chamber', Wonder: 'chamber', Dawn: 'chamber',
  Night: 'tunnel', Dusk: 'tunnel', Quiet: 'tunnel',
};
export const moodZone = (mood: string): ZoneKind => ZONE_OF[mood] ?? 'tunnel';

/** "#8b0000" to [139, 0, 0]; a colour it cannot read is the Quiet slate. */
export function hexToRgb(hex: string): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [100, 116, 139];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The journey a script makes: one section per scene, in order, as wide as the scene is long (the timeline's own lengths). Null with no scenes. */
export function journeyFromScenes(scenes: TimelineSceneInput[], content: string | null): Journey | null {
  if (!scenes.length) return null;
  const moods = new Map<number, { mood: string; color: string }>();
  const lineCounts = new Map<number, number>();
  if (content) {
    const parsed = parseScript(content);
    parsed.scenes.forEach((sc, i) => {
      const body = parsed.lines.slice(sc.startIndex + 1, sc.endIndex + 1).map((l) => l.text).join('\n');
      const m = sceneMood(body, sc.timeOfDay);
      moods.set(i + 1, { mood: m.mood, color: m.color });
      lineCounts.set(i + 1, sc.endIndex - sc.startIndex);
    });
  }
  const tl = buildTimeline({ scenes, tracks: [], moods, lineCounts });
  const total = tl.totalMinutes || 1;
  const sections: JourneySection[] = tl.scenes.map((s) => ({
    number: s.number, heading: s.heading, mood: s.mood, color: asLight(hexToRgb(s.color), 120), zone: moodZone(s.mood),
    from: s.start / total, to: (s.start + s.minutes) / total,
  }));
  return { sections, key: sections.map((s) => `${s.number}:${s.mood}:${s.to.toFixed(3)}`).join('|') };
}

/** How far through the song it is, 0 to 1; null when the song's length is not known (so there is nothing to lay the journey along). */
export function songFraction(progressMs: number, durationMs: number): number | null {
  if (!(durationMs > 0)) return null;
  return Math.min(1, Math.max(0, progressMs / durationMs));
}

/** The least cave a scene gets, in screen heights: a short song with many scenes still gives each a place to be. */
export const MIN_SECTION_X = 3;

/** How long the journey is in the cave, in screen heights: the song's seconds at the runner's own pace, but never so short a scene vanishes. */
export function journeyLength(journey: Journey, durationMs: number): number {
  return Math.max((durationMs / 1000) * CRUISE, journey.sections.length * MIN_SECTION_X);
}

/** Where the journey's sections sit in the cave: `origin` is the x where the song's start would be. */
export function journeyZones(journey: Journey, length: number, origin: number): ZoneSegment[] {
  return journey.sections.map((s) => ({ start: origin + s.from * length, end: origin + s.to * length, kind: s.zone }));
}

/** The x the song's progress says the cave should be at. */
export const journeyTarget = (fraction: number, length: number, origin: number) => origin + fraction * length;

/** The origin that puts `fraction` of the song at `x`: used when the journey is (re)built at a point beyond the screen, so a song joined or sought mid-way starts there. */
export const originFor = (x: number, fraction: number, length: number) => x - fraction * length;

/**
 * The speed multiplier that keeps the figure with the song: behind it, run to catch up (up to 1.7x); ahead of it, wait (down to 0.55x).
 * Steering still works inside that band, but the song decides where in the film the cave is.
 */
export function journeyPace(x: number, target: number): number {
  return Math.min(1.7, Math.max(0.55, 1 + 0.25 * (target - x)));
}

/** Further apart than this (a seek, a new song, switching back from the Dive) and the journey is rebuilt at the figure instead of the figure chasing. */
export const RESYNC_DISTANCE = 8;
export const needsResync = (x: number, target: number) => Math.abs(target - x) > RESYNC_DISTANCE;

/** Which section a fraction of the song falls in, and how far through it (0 to 1). */
export function sectionAt(journey: Journey, fraction: number): { index: number; section: JourneySection; into: number } {
  const f = Math.min(1, Math.max(0, fraction));
  const last = journey.sections.length - 1;
  let index = journey.sections.findIndex((s) => f < s.to);
  if (index < 0) index = last;
  const s = journey.sections[index];
  const span = s.to - s.from;
  return { index, section: s, into: span > 0 ? Math.min(1, Math.max(0, (f - s.from) / span)) : 0 };
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];

/** How much the scene's mood colours the light against the album cover's: the scene leads, the cover still shows through. */
export const MOOD_WEIGHT = 0.7;
const EDGE = 0.2;

/** The light's colour at a point of the journey: the scene's mood colour (eased into its neighbour's near the edges), mixed with the cover's. */
export function journeyTint(journey: Journey, fraction: number, cover: Rgb): Rgb {
  const { index, section, into } = sectionAt(journey, fraction);
  let mood = section.color;
  if (into < EDGE && index > 0) mood = mixRgb(journey.sections[index - 1].color, section.color, smooth(0.5 + into / (2 * EDGE)));
  else if (into > 1 - EDGE && index < journey.sections.length - 1) mood = mixRgb(section.color, journey.sections[index + 1].color, smooth((into - (1 - EDGE)) / (2 * EDGE)));
  return mixRgb(cover, mood, MOOD_WEIGHT);
}

export type JourneyStatus = 'no-project' | 'loading' | 'no-scenes' | 'failed' | 'ready';

export interface SyncReport {
  /** The levels in play (the plan's): 1 the player's state, 2 real audio, 3 the project. */
  levels: number[];
  /** What to say, honestly, in a corner label. */
  text: string;
}

/** The honest label: which sync level the cave is running at, and why the project's level is off when it is. */
export function describeSync(input: {
  status: JourneyStatus;
  journey: Journey | null;
  /** The song's length is known (a journey needs it). */
  durationKnown: boolean;
  fraction: number | null;
  listening: boolean;
}): SyncReport {
  const levels = [1];
  let text: string;
  if (input.status === 'ready' && input.journey && input.durationKnown && input.fraction !== null) {
    levels.push(3);
    const { section } = sectionAt(input.journey, input.fraction);
    const where = `scene ${section.number} of ${input.journey.sections.length}, ${section.mood}`;
    text = `Following the project: ${where}. The scenes are laid along the song by their length (the song is not your cut).`;
  } else if (input.status === 'ready' && input.journey) text = 'The song’s length is not known, so there is no journey: the cave follows the player only.';
  else if (input.status === 'loading') text = 'Reading the project’s scenes… following the player for now.';
  else if (input.status === 'no-scenes') text = 'This project has no scenes yet: the cave follows the player only.';
  else if (input.status === 'failed') text = 'Could not read the project’s scenes: the cave follows the player only.';
  else text = 'No project open: the cave follows the player only.';
  if (input.listening) levels.splice(1, 0, 2);
  return { levels, text };
}
