// The Sound page's Scenes timeline: the film's scenes left to right (width by length), each scene's music in a lane per role, and
// the scenes that have no music drawn as gaps. Pure: the page loads scenes, moods and tracks, this builds the picture.
// Plan: .cavern-intelligence/plans/2026-11-08-scenes-timeline.md
import { AUDIO_ROLES, type AudioRole } from '@/lib/supabase/audio';

export interface TimelineSceneInput {
  id: string;
  scene_number: number;
  heading: string | null;
  time_of_day: string | null;
  /** The breakdown's page length, e.g. "3/8" (eighths of a page); null when not measured. */
  est_duration: string | null;
  /** What the table read measured, in seconds. */
  read_seconds: number | null;
}

export interface TimelineTrackInput {
  id: string;
  title: string | null;
  uri: string;
  for_scene: string | null;
  role: string | null;
  tags: string[] | null;
}

export interface SceneMoodInput { mood: string; color: string }

/** Where a scene's width came from, in order of trust. */
export type LengthSource = 'read' | 'pages' | 'lines' | 'floor';

export interface TimelineScene {
  id: string;
  number: number;
  heading: string;
  mood: string;
  color: string;
  /** Minutes: one page a minute when only page eighths are known. */
  minutes: number;
  source: LengthSource;
  /** Where it starts on the axis, in minutes. */
  start: number;
  /** True when no track is tagged to it in any lane. */
  silent: boolean;
}

export interface TimelineBar {
  trackId: string;
  sceneId: string;
  title: string;
  uri: string;
  /** Tracks sharing a song get the same swatch, so a theme that returns reads as one. */
  swatch: number;
  tags: string[];
}

export interface TimelineLane { role: AudioRole | 'none'; label: string; bars: TimelineBar[] }

export interface Timeline {
  scenes: TimelineScene[];
  lanes: TimelineLane[];
  totalMinutes: number;
  /** Scenes with no music, in order. */
  gaps: TimelineScene[];
  /** Tracks tagged to a scene that is not in this script (another script, or deleted since). */
  elsewhere: number;
}

/** The shortest a scene is drawn, so a one-eighth scene is still a block to hover and tap. */
export const MIN_SCENE_MINUTES = 0.4;
export const LINES_PER_PAGE = 55;
const ROLE_ORDER: AudioRole[] = ['theme', 'source', 'temp', 'needle_drop', 'ambience'];

const eighths = (est: string | null) => {
  const m = String(est ?? '').match(/(\d+)\s*\/\s*8/);
  return m ? Math.max(1, Number(m[1])) : null;
};

/** A scene's length: the table read's seconds, else page eighths at a page a minute, else its line count, else a floor. */
export function sceneLength(s: Pick<TimelineSceneInput, 'est_duration' | 'read_seconds'>, lineCount?: number): { minutes: number; source: LengthSource } {
  if (s.read_seconds && s.read_seconds > 0) return { minutes: Math.max(MIN_SCENE_MINUTES, s.read_seconds / 60), source: 'read' };
  const e = eighths(s.est_duration);
  if (e) return { minutes: Math.max(MIN_SCENE_MINUTES, e / 8), source: 'pages' };
  if (lineCount && lineCount > 0) return { minutes: Math.max(MIN_SCENE_MINUTES, lineCount / LINES_PER_PAGE), source: 'lines' };
  return { minutes: MIN_SCENE_MINUTES, source: 'floor' };
}

const QUIET = { mood: 'Quiet', color: '#64748b' };

export function buildTimeline(input: {
  scenes: TimelineSceneInput[];
  tracks: TimelineTrackInput[];
  moods?: Map<number, SceneMoodInput>;
  lineCounts?: Map<number, number>;
}): Timeline {
  const ordered = [...input.scenes].sort((a, b) => a.scene_number - b.scene_number);
  const withTrack = new Set(input.tracks.filter((t) => t.for_scene).map((t) => t.for_scene!));
  let start = 0;
  const scenes: TimelineScene[] = ordered.map((s) => {
    const { minutes, source } = sceneLength(s, input.lineCounts?.get(s.scene_number));
    const m = input.moods?.get(s.scene_number) ?? QUIET;
    const out: TimelineScene = {
      id: s.id, number: s.scene_number, heading: s.heading ?? `Scene ${s.scene_number}`, mood: m.mood, color: m.color,
      minutes, source, start, silent: !withTrack.has(s.id),
    };
    start += minutes;
    return out;
  });

  const known = new Set(scenes.map((s) => s.id));
  const swatchOf = new Map<string, number>();
  const lanes = new Map<AudioRole | 'none', TimelineLane>();
  let elsewhere = 0;
  for (const t of input.tracks) {
    if (!t.for_scene) continue;
    if (!known.has(t.for_scene)) { elsewhere += 1; continue; }
    const role: AudioRole | 'none' = t.role && t.role in AUDIO_ROLES ? (t.role as AudioRole) : 'none';
    if (!swatchOf.has(t.uri)) swatchOf.set(t.uri, swatchOf.size);
    const lane = lanes.get(role) ?? { role, label: role === 'none' ? 'No role' : AUDIO_ROLES[role], bars: [] };
    lane.bars.push({ trackId: t.id, sceneId: t.for_scene, title: t.title ?? 'Untitled', uri: t.uri, swatch: swatchOf.get(t.uri)!, tags: t.tags ?? [] });
    lanes.set(role, lane);
  }
  const orderedLanes = [...ROLE_ORDER, 'none' as const].flatMap((r) => (lanes.has(r) ? [lanes.get(r)!] : []));
  return { scenes, lanes: orderedLanes, totalMinutes: start, gaps: scenes.filter((s) => s.silent), elsewhere };
}

/** "1:05" for 1.08 minutes; "45 s" under a minute. */
export function formatMinutes(min: number): string {
  if (min < 1) return `${Math.round(min * 60)} s`;
  const total = Math.round(min * 60);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Words for a block, for the accessible name and the tooltip: "Scene 4, Dread, 2:00, no music". */
export function sceneSummary(s: TimelineScene, trackCount: number): string {
  return `Scene ${s.number}, ${s.mood}, ${formatMinutes(s.minutes)}${s.source === 'floor' ? ' (length not known)' : ''}, ${trackCount ? `${trackCount} track${trackCount === 1 ? '' : 's'}` : 'no music'}`;
}
