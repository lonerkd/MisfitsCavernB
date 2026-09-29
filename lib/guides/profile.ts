// How someone works, from profiles.ui_prefs.guide: the answers that decide
// how deep a guide goes and how fast it expects the work to move. Pure — no
// Supabase import — so it's safe anywhere and in tests.

export type Experience = 'first' | 'some' | 'seasoned';
export type Team = 'solo' | 'small' | 'crew';
export type Depth = 'walkthrough' | 'tips' | 'light';

export interface GuideProfile {
  /** Hours a week for the project, 1–80. */
  hours: number;
  experience: Experience;
  team: Team;
  /** Chosen depth; absent means it follows experience. */
  depth?: Depth;
}

export const EXPERIENCES: Array<{ id: Experience; label: string; hint: string }> = [
  { id: 'first', label: 'This is my first', hint: 'Never finished a film (or this kind of project) before' },
  { id: 'some', label: 'I’ve made a few', hint: 'Shorts, school work, music videos — some finished' },
  { id: 'seasoned', label: 'I do this for a living', hint: 'You know the process; you want the tools' },
];

export const TEAMS: Array<{ id: Team; label: string; hint: string }> = [
  { id: 'solo', label: 'Just me', hint: 'You write, shoot and cut it yourself' },
  { id: 'small', label: 'A few friends', hint: 'Two to six people wearing several hats' },
  { id: 'crew', label: 'A real crew', hint: 'Departments, heads of department, a schedule' },
];

export const DEPTHS: Array<{ id: Depth; label: string; hint: string }> = [
  { id: 'walkthrough', label: 'Walk me through it', hint: 'Every step with why, how and what to watch for — plus the basics' },
  { id: 'tips', label: 'Steps and tips', hint: 'What to do next, with a tip for each' },
  { id: 'light', label: 'Just the checklist', hint: 'One line per step' },
];

/** Hours-a-week presets offered as quick picks. */
export const HOUR_PRESETS = [3, 8, 15, 25, 40] as const;

const DEPTH_FOR: Record<Experience, Depth> = { first: 'walkthrough', some: 'tips', seasoned: 'light' };

/** The depth in force: the chosen one, else what the experience suggests. */
export function depthOf(profile: Pick<GuideProfile, 'experience' | 'depth'>): Depth {
  return profile.depth ?? DEPTH_FOR[profile.experience];
}

export const DEFAULT_PROFILE: GuideProfile = { hours: 8, experience: 'some', team: 'small' };

const oneOf = <T extends string>(v: unknown, ids: readonly T[]): T | undefined =>
  typeof v === 'string' && (ids as readonly string[]).includes(v) ? (v as T) : undefined;

/** Tolerant reader for ui_prefs.guide: null when it was never set (or is unusable). */
export function toGuideProfile(raw: unknown): GuideProfile | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const experience = oneOf(r.experience, ['first', 'some', 'seasoned'] as const);
  if (!experience) return null;
  const hours = typeof r.hours === 'number' && Number.isInteger(r.hours) && r.hours >= 1 && r.hours <= 80 ? r.hours : DEFAULT_PROFILE.hours;
  const team = oneOf(r.team, ['solo', 'small', 'crew'] as const) ?? DEFAULT_PROFILE.team;
  const depth = oneOf(r.depth, ['walkthrough', 'tips', 'light'] as const);
  return depth ? { hours, experience, team, depth } : { hours, experience, team };
}
