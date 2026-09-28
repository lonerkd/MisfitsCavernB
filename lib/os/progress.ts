// ── The phase engine ─────────────────────────────────────────────
// A project is built up like Lego: each phase brings the tools that are
// useful at that point, and milestones — read from the project's real data,
// never ticked by hand — show what's done and what comes next. Tools unlock
// when the project reaches their phase, or earlier once the work they hold
// has started (a cut added during the shoot opens cut review). Owners can
// open everything at once in project settings.

import { type Phase, type FormatRules, phasesFor, mapStatusToPhase, phaseIndexIn, toFormatRules } from './phases';

/** Counts from `project_progress(project)` — what the caller can see. */
export interface ProjectSignals {
  status: string | null;
  project_type: string | null;
  /** The project's format rules (phase names, skipped phases and milestones). */
  format: FormatRules | null;
  visibility: string | null;
  /** The owner opened every tool (project settings). */
  unlock_all: boolean;
  logline: boolean;
  scripts: number;
  characters: number;
  scenes: number;
  scenes_wrapped: number;
  beats: number;
  media: number;
  media_shared: number;
  crew: number;
  castings: number;
  shots: number;
  call_sheets: number;
  tasks: number;
  tasks_done: number;
  budget_lines: number;
  milestones: number;
  cuts: number;
  post_notes: number;
  post_notes_open: number;
  stages: number;
  stages_done: number;
  deliverables: number;
  deliverables_done: number;
  campaigns: number;
  festivals_submitted: number;
  portfolio: number;
}

export const EMPTY_SIGNALS: ProjectSignals = {
  status: null, project_type: null, format: null, visibility: null, unlock_all: false, logline: false,
  scripts: 0, characters: 0, scenes: 0, scenes_wrapped: 0, beats: 0, media: 0, media_shared: 0,
  crew: 0, castings: 0, shots: 0, call_sheets: 0, tasks: 0, tasks_done: 0, budget_lines: 0, milestones: 0,
  cuts: 0, post_notes: 0, post_notes_open: 0, stages: 0, stages_done: 0, deliverables: 0, deliverables_done: 0,
  campaigns: 0, festivals_submitted: 0, portfolio: 0,
};

/** Where a milestone or tool is worked on. `hub` is the project page. */
export type Place =
  | { kind: 'hub'; anchor?: 'logline' | 'production' }
  | { kind: 'studio'; tab: StudioTab; view?: ProductionView }
  | { kind: 'path'; path: string };

export type StudioTab = 'overview' | 'library' | 'scenes' | 'production' | 'post' | 'promos' | 'pitch' | 'share';
export type ProductionView = 'story' | 'breakdown' | 'readiness' | 'schedule' | 'onset' | 'crew';

export function placeHref(place: Place, projectId: string): string {
  if (place.kind === 'hub') return `/projects/${projectId}${place.anchor ? `#${place.anchor}` : ''}`;
  if (place.kind === 'studio') return `/studio?tab=${place.tab}${place.view ? `&view=${place.view}` : ''}`;
  return place.path;
}

// ── Milestones ───────────────────────────────────────────────────

export interface MilestoneDef {
  id: string;
  phase: Phase;
  label: string;
  hint: string;
  place: Place;
  done: (s: ProjectSignals) => boolean;
  /** Partial progress toward `done`, when it is a count. */
  progress?: (s: ProjectSignals) => { value: number; of: number };
}

export const MILESTONES: MilestoneDef[] = [
  // Development — find the story.
  { id: 'logline', phase: 'development', label: 'Write the logline', hint: 'A sentence or two. It leads the pitch deck and the share page.',
    place: { kind: 'hub', anchor: 'logline' }, done: (s) => s.logline },
  { id: 'script', phase: 'development', label: 'Start the script', hint: 'Scene headings (INT./EXT.) become scenes in Studio as you write.',
    place: { kind: 'path', path: '/editor' }, done: (s) => s.scripts > 0 },
  { id: 'characters', phase: 'development', label: 'Build a character', hint: 'Characters panel in the editor: who they are, what they want.',
    place: { kind: 'path', path: '/editor' }, done: (s) => s.characters > 0 },
  { id: 'beats', phase: 'development', label: 'Outline three beats', hint: 'The spine of the story, on the beat board.',
    place: { kind: 'studio', tab: 'production', view: 'story' }, done: (s) => s.beats >= 3,
    progress: (s) => ({ value: Math.min(s.beats, 3), of: 3 }) },
  { id: 'references', phase: 'development', label: 'Gather five references', hint: 'Images, clips and links for the look and feel.',
    place: { kind: 'studio', tab: 'library' }, done: (s) => s.media >= 5,
    progress: (s) => ({ value: Math.min(s.media, 5), of: 5 }) },

  // Pre-production — plan the shoot.
  { id: 'crew', phase: 'pre-production', label: 'Bring in your crew', hint: 'Invite collaborators, or post roles to the Jobs board.',
    place: { kind: 'hub', anchor: 'production' }, done: (s) => s.crew > 0 },
  { id: 'casting', phase: 'pre-production', label: 'Cast a role', hint: 'Match characters to people on the crew.',
    place: { kind: 'studio', tab: 'production', view: 'crew' }, done: (s) => s.castings > 0 },
  { id: 'shots', phase: 'pre-production', label: 'Plan your shots', hint: 'A shot list for each scene.',
    place: { kind: 'studio', tab: 'scenes' }, done: (s) => s.shots > 0 },
  { id: 'budget', phase: 'pre-production', label: 'Set a budget', hint: 'Estimate one from the script, then adjust.',
    place: { kind: 'hub', anchor: 'production' }, done: (s) => s.budget_lines > 0 },
  { id: 'schedule', phase: 'pre-production', label: 'Date your first shoot day', hint: 'Schedule → call sheet with a date.',
    place: { kind: 'studio', tab: 'production', view: 'schedule' }, done: (s) => s.call_sheets > 0 },

  // Production — shoot it.
  { id: 'wrap-first', phase: 'production', label: 'Wrap your first scene', hint: 'Mark scenes wrapped as you shoot them.',
    place: { kind: 'studio', tab: 'production', view: 'schedule' }, done: (s) => s.scenes_wrapped > 0 },
  { id: 'wrap-all', phase: 'production', label: 'Wrap every scene', hint: 'The shoot is done when every scene is.',
    place: { kind: 'studio', tab: 'production', view: 'schedule' }, done: (s) => s.scenes > 0 && s.scenes_wrapped >= s.scenes,
    progress: (s) => ({ value: s.scenes_wrapped, of: s.scenes }) },
  { id: 'tasks', phase: 'production', label: 'Clear the task list', hint: 'Every task on the project page done.',
    place: { kind: 'hub', anchor: 'production' }, done: (s) => s.tasks > 0 && s.tasks_done >= s.tasks,
    progress: (s) => ({ value: s.tasks_done, of: s.tasks }) },

  // Post-production — find the film in the edit.
  { id: 'cut', phase: 'post-production', label: 'Add your first cut', hint: 'A link or a video from the library.',
    place: { kind: 'studio', tab: 'post' }, done: (s) => s.cuts > 0 },
  { id: 'notes', phase: 'post-production', label: 'Review it with notes', hint: 'Timecoded notes, by department.',
    place: { kind: 'studio', tab: 'post' }, done: (s) => s.post_notes > 0 },
  { id: 'notes-resolved', phase: 'post-production', label: 'Resolve every note', hint: 'Nothing left open on any cut.',
    place: { kind: 'studio', tab: 'post' }, done: (s) => s.post_notes > 0 && s.post_notes_open === 0,
    progress: (s) => ({ value: s.post_notes - s.post_notes_open, of: s.post_notes }) },
  { id: 'pipeline', phase: 'post-production', label: 'Finish the post pipeline', hint: 'Edit, sound, colour, music, titles.',
    place: { kind: 'studio', tab: 'post' }, done: (s) => s.stages > 0 && s.stages_done >= s.stages,
    progress: (s) => ({ value: s.stages_done, of: s.stages }) },

  // Delivery — get it seen.
  { id: 'deliverables', phase: 'delivery', label: 'Deliver everything', hint: 'Masters, captions, stills, press kit.',
    place: { kind: 'studio', tab: 'post' }, done: (s) => s.deliverables > 0 && s.deliverables_done >= s.deliverables,
    progress: (s) => ({ value: s.deliverables_done, of: s.deliverables }) },
  { id: 'share', phase: 'delivery', label: 'Share it', hint: 'Open the project by link or to everyone.',
    place: { kind: 'studio', tab: 'share' }, done: (s) => s.visibility === 'link' || s.visibility === 'public' },
  { id: 'festival', phase: 'delivery', label: 'Submit to a festival', hint: 'Track submissions and results on the project page.',
    place: { kind: 'hub', anchor: 'production' }, done: (s) => s.festivals_submitted > 0 },
  { id: 'portfolio', phase: 'delivery', label: 'Add it to your portfolio', hint: 'Show the work on your profile.',
    place: { kind: 'path', path: '/portfolio' }, done: (s) => s.portfolio > 0 },
];

// ── Tools ────────────────────────────────────────────────────────

export type ToolId =
  | 'script' | 'library' | 'story' | 'pitch' | 'soundtrack'
  | 'scenes' | 'schedule' | 'crew' | 'budget' | 'share' | 'jobs' | 'onset'
  | 'post' | 'promos' | 'festivals' | 'portfolio';

export interface ToolDef {
  id: ToolId;
  label: string;
  blurb: string;
  phase: Phase;
  place: Place;
  /** Opens before its phase once this is true — the work has started. */
  early?: (s: ProjectSignals) => boolean;
}

export const TOOLS: ToolDef[] = [
  { id: 'script', label: 'Script editor', blurb: 'Write, with scenes kept in step.', phase: 'development', place: { kind: 'path', path: '/editor' } },
  { id: 'library', label: 'Library & boards', blurb: 'References, mood boards, uploads.', phase: 'development', place: { kind: 'studio', tab: 'library' } },
  { id: 'story', label: 'Beat board', blurb: 'Outline the story.', phase: 'development', place: { kind: 'studio', tab: 'production', view: 'story' } },
  { id: 'pitch', label: 'Pitch deck', blurb: 'Present the idea.', phase: 'development', place: { kind: 'studio', tab: 'pitch' } },
  { id: 'soundtrack', label: 'Soundtrack', blurb: 'Music to work to, and for the film.', phase: 'development', place: { kind: 'path', path: '/soundtrack' } },
  { id: 'share', label: 'Share page', blurb: 'A lookbook for crew and backers.', phase: 'development', place: { kind: 'studio', tab: 'share' } },

  { id: 'scenes', label: 'Scenes & shot lists', blurb: 'Every scene, its references and shots.', phase: 'pre-production',
    place: { kind: 'studio', tab: 'scenes' }, early: (s) => s.scenes > 0 },
  { id: 'schedule', label: 'Schedule & call sheets', blurb: 'Shoot days, call times, the day’s sheet.', phase: 'pre-production',
    place: { kind: 'studio', tab: 'production', view: 'schedule' }, early: (s) => s.call_sheets > 0 },
  { id: 'crew', label: 'Cast & crew', blurb: 'Roles, casting, who’s on the day.', phase: 'pre-production',
    place: { kind: 'studio', tab: 'production', view: 'crew' }, early: (s) => s.crew > 0 || s.castings > 0 },
  { id: 'budget', label: 'Budget', blurb: 'Estimate from the script; track actuals.', phase: 'pre-production',
    place: { kind: 'hub', anchor: 'production' }, early: (s) => s.budget_lines > 0 },
  { id: 'jobs', label: 'Jobs board', blurb: 'Find crew for open roles.', phase: 'pre-production', place: { kind: 'path', path: '/jobs' } },

  { id: 'onset', label: 'On set', blurb: 'The shoot day: the clock, shots got, scenes wrapped, continuity.', phase: 'production',
    place: { kind: 'studio', tab: 'production', view: 'onset' }, early: (s) => s.call_sheets > 0 },

  { id: 'post', label: 'Cut review & delivery', blurb: 'Cuts, timecoded notes, the post pipeline.', phase: 'post-production',
    place: { kind: 'studio', tab: 'post' }, early: (s) => s.cuts > 0 || s.stages > 0 || s.deliverables > 0 },

  { id: 'promos', label: 'Promos & campaigns', blurb: 'Plan the release.', phase: 'delivery',
    place: { kind: 'studio', tab: 'promos' }, early: (s) => s.campaigns > 0 },
  { id: 'festivals', label: 'Festivals', blurb: 'Submissions and results.', phase: 'delivery',
    place: { kind: 'hub', anchor: 'production' }, early: (s) => s.festivals_submitted > 0 },
  { id: 'portfolio', label: 'Portfolio', blurb: 'Show the finished work.', phase: 'delivery',
    place: { kind: 'path', path: '/portfolio' }, early: (s) => s.portfolio > 0 },
];

/** The tool that owns each Studio tab and Production view (tabs not listed are always open). */
export const STUDIO_TAB_TOOL: Partial<Record<StudioTab, ToolId>> = {
  scenes: 'scenes', post: 'post', promos: 'promos',
};
export const PRODUCTION_VIEW_TOOL: Partial<Record<ProductionView, ToolId>> = {
  schedule: 'schedule', onset: 'onset', crew: 'crew',
};

// ── The computed view ────────────────────────────────────────────

export interface MilestoneState {
  id: string;
  label: string;
  hint: string;
  place: Place;
  done: boolean;
  progress: { value: number; of: number } | null;
}

export interface PhaseState {
  id: Phase;
  label: string;
  abbr: string;
  index: number;
  milestones: MilestoneState[];
  done: number;
  total: number;
}

export interface ToolState {
  id: ToolId;
  label: string;
  blurb: string;
  place: Place;
  /** Index into `phases` where this tool unlocks for this project's format. */
  phaseIndex: number;
  phaseLabel: string;
  unlocked: boolean;
  /** Opened before its phase because the work already started. */
  early: boolean;
}

export interface ProjectProgress {
  phases: PhaseState[];
  currentIndex: number;
  current: PhaseState;
  next: PhaseState | null;
  /** Every milestone of the current phase is done. */
  ready: boolean;
  /** Up to three undone milestones: the current phase first, then any left behind. */
  nextSteps: MilestoneState[];
  tools: ToolState[];
  /** Milestones done across the whole project, for a single progress figure. */
  totals: { done: number; total: number };
}

export function computeProgress(s: ProjectSignals, opts: { unlockAll?: boolean } = {}): ProjectProgress {
  const unlockAll = opts.unlockAll ?? s.unlock_all;
  const format = s.format;
  const visible = phasesFor(format);
  const currentIndex = phaseIndexIn(format, mapStatusToPhase(s.status ?? undefined));
  const skipped = new Set(format?.skip_milestones ?? []);

  const phases: PhaseState[] = visible.map((p, index) => ({ ...p, index, milestones: [], done: 0, total: 0 }));
  for (const m of MILESTONES) {
    if (skipped.has(m.id)) continue;
    const phase = phases[phaseIndexIn(format, m.phase)];
    const done = m.done(s);
    const progress = m.progress ? m.progress(s) : null;
    phase.milestones.push({
      id: m.id, label: m.label, hint: m.hint, place: m.place, done,
      progress: progress && progress.of > 0 ? progress : null,
    });
    phase.total += 1;
    if (done) phase.done += 1;
  }

  const current = phases[currentIndex];
  const nextSteps = [
    ...current.milestones.filter((m) => !m.done),
    ...phases.slice(0, currentIndex).flatMap((p) => p.milestones.filter((m) => !m.done)),
  ].slice(0, 3);

  const tools: ToolState[] = TOOLS.map((t) => {
    const phaseIndex = phaseIndexIn(format, t.phase);
    const byPhase = currentIndex >= phaseIndex;
    const early = !byPhase && !!t.early?.(s);
    return {
      id: t.id, label: t.label, blurb: t.blurb, place: t.place,
      phaseIndex, phaseLabel: phases[phaseIndex].label,
      unlocked: unlockAll || byPhase || early,
      early,
    };
  });

  return {
    phases,
    currentIndex,
    current,
    next: phases[currentIndex + 1] ?? null,
    ready: current.total > 0 && current.done === current.total,
    nextSteps,
    tools,
    totals: phases.reduce((t, p) => ({ done: t.done + p.done, total: t.total + p.total }), { done: 0, total: 0 }),
  };
}

/** Tools a move to phase `index` opens that weren't open before it. */
export function toolsOpenedAt(progress: ProjectProgress, index: number): ToolState[] {
  return progress.tools.filter((t) => t.phaseIndex === index && !t.early);
}

export function toolState(progress: ProjectProgress | null, id: ToolId): ToolState | null {
  return progress?.tools.find((t) => t.id === id) ?? null;
}

/** Normalises the RPC's JSON: missing or malformed fields read as zero. */
export function toSignals(raw: unknown): ProjectSignals | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const out = { ...EMPTY_SIGNALS } as unknown as Record<string, unknown>;
  for (const key of Object.keys(EMPTY_SIGNALS)) {
    if (key === 'format') { out.format = toFormatRules(r.format); continue; }
    const base = (EMPTY_SIGNALS as unknown as Record<string, unknown>)[key];
    const v = r[key];
    if (typeof base === 'number') out[key] = typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0;
    else if (typeof base === 'boolean') out[key] = v === true;
    else out[key] = typeof v === 'string' ? v : null;
  }
  return out as unknown as ProjectSignals;
}
