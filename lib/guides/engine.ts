// A guide, computed: the workflow's steps for this project and this person —
// which are done (from the project's data, or ticked by hand), the words at
// the depth they asked for, what to do next, what fits in this week's hours,
// and roughly how many weeks are left at their pace. Pure; unit-tested.

import { phaseIndexIn, phasesFor, mapStatusToPhase, type Phase } from '@/lib/os/phases';
import { MILESTONES, type Place, type ProjectSignals } from '@/lib/os/progress';
import { depthOf, type Depth, type Experience, type GuideProfile, type Team } from './profile';
import { STEPS, STRUCTURES, type Dept, type StepDef } from './steps';
import { WORKFLOW_BY_ID, applyOverride, type Workflow } from './workflows';

export interface GuideInput {
  workflow: Workflow;
  profile: GuideProfile;
  signals: ProjectSignals;
  /** Steps ticked by hand (guide_progress.done). */
  ticked: readonly string[];
  /** The brief's story structure answer, if any. */
  structure?: string | null;
  /** The person's department on this project (on-the-crew guides). */
  dept?: Dept | null;
}

export interface GuideStep {
  id: string;
  title: string;
  phase: Phase;
  phaseIndex: number;
  place: Place;
  /** Hours left on it at this person's pace (0 once done). */
  hours: number;
  done: boolean;
  /** Ticks itself from the project's data (can't be ticked by hand). */
  auto: boolean;
  learn: boolean;
  progress: { value: number; of: number } | null;
  /** The words at this depth: `do` always; `tip` from tips; the rest at walkthrough. */
  text: { do: string; tip?: string; why?: string; how?: string[]; watch?: string };
}

export interface GuidePhase { id: Phase; label: string; index: number; steps: GuideStep[]; done: number; total: number }

export interface GuideView {
  workflow: Workflow;
  depth: Depth;
  phases: GuidePhase[];
  currentIndex: number;
  /** The first step still to do: the current phase's, else one left behind, else the next phase's. */
  next: GuideStep | null;
  /** Steps that fit this week's hours, in order (always at least one while any are left). */
  thisWeek: GuideStep[];
  hoursLeft: number;
  /** Weeks left at this person's hours a week (0 when finished). */
  weeksLeft: number;
  totals: { done: number; total: number };
}

// Effort scales with who's doing it: alone, everything is slower; with a
// crew, the work is shared. First-timers take longer; professionals less.
export const TEAM_FACTOR: Record<Team, number> = { solo: 1.3, small: 1, crew: 0.8 };
export const EXPERIENCE_FACTOR: Record<Experience, number> = { first: 1.3, some: 1, seasoned: 0.8 };

const roundHalf = (n: number) => Math.max(0.5, Math.round(n * 2) / 2);

export function paceHours(base: number, profile: Pick<GuideProfile, 'team' | 'experience'>): number {
  return roundHalf(base * TEAM_FACTOR[profile.team] * EXPERIENCE_FACTOR[profile.experience]);
}

/** Whether a step belongs in this person's guide at all. */
function applies(step: StepDef, input: GuideInput, depth: Depth, skipped: Set<string>): boolean {
  if (step.learn && depth !== 'walkthrough') return false;
  if (step.teams && !step.teams.includes(input.profile.team)) return false;
  if (step.depts && !step.depts.includes(input.dept ?? 'other')) return false;
  if (step.milestone && skipped.has(step.milestone)) return false;
  return true;
}

/** The outline step, in the words of the structure the brief chose. */
function withStructure(step: StepDef, structure: string | null | undefined): StepDef {
  const s = structure ? STRUCTURES[structure] : undefined;
  if (step.id !== 'beats' || !s) return step;
  return { ...step, title: `Outline the ${s.name}`, text: { ...step.text, how: s.beats } };
}

export function computeGuide(input: GuideInput): GuideView {
  const { workflow, profile, signals: s } = input;
  const depth = depthOf(profile);
  const format = s.format;
  const visible = phasesFor(format);
  const currentIndex = phaseIndexIn(format, mapStatusToPhase(s.status ?? undefined));
  const skipped = new Set(format?.skip_milestones ?? []);
  const ticked = new Set(input.ticked);
  const phases: GuidePhase[] = visible.map((p, index) => ({ id: p.id, label: p.label, index, steps: [], done: 0, total: 0 }));

  for (const id of workflow.steps) {
    const base = STEPS[id];
    if (!base) continue;
    const def = withStructure(applyOverride(base, workflow.overrides?.[id]), input.structure);
    if (!applies(def, input, depth, skipped)) continue;
    const milestone = def.milestone ? MILESTONES.find((m) => m.id === def.milestone) : undefined;
    const auto = !!(milestone || def.auto);
    const done = milestone ? milestone.done(s) : def.auto ? def.auto(s) : ticked.has(id);
    const raw = milestone?.progress?.(s) ?? null;
    const progress = raw && raw.of > 0 ? raw : null;
    const share = done ? 0 : progress ? 1 - Math.min(progress.value, progress.of) / progress.of : 1;
    const phaseIndex = phaseIndexIn(format, def.phase);
    const t = def.text;
    const text: GuideStep['text'] =
      depth === 'light' ? { do: t.do }
        : depth === 'tips' ? { do: t.do, tip: t.tip }
        : { do: t.do, tip: t.tip, why: t.why, how: t.how, watch: t.watch };
    const step: GuideStep = {
      id, title: def.title, phase: visible[phaseIndex].id, phaseIndex, place: def.place,
      hours: done ? 0 : roundHalf(paceHours(def.hours, profile) * share),
      done, auto, learn: !!def.learn, progress, text,
    };
    const phase = phases[phaseIndex];
    phase.steps.push(step);
    phase.total += 1;
    if (done) phase.done += 1;
  }

  // Next: the current phase's first open step, then anything left behind,
  // then whatever comes after.
  const open = phases.flatMap((p) => p.steps).filter((x) => !x.done);
  const rank = (x: GuideStep) => (x.phaseIndex === currentIndex ? 0 : x.phaseIndex < currentIndex ? 1 : 2 + x.phaseIndex);
  const queue = [...open].sort((a, b) => rank(a) - rank(b));

  const thisWeek: GuideStep[] = [];
  let budget = profile.hours;
  for (const step of queue) {
    if (thisWeek.length > 0 && step.hours > budget) break;
    thisWeek.push(step);
    budget -= step.hours;
    if (budget <= 0) break;
  }

  const hoursLeft = Math.round(open.reduce((n, x) => n + x.hours, 0) * 2) / 2;
  const total = phases.reduce((n, p) => n + p.total, 0);
  return {
    workflow, depth, phases, currentIndex,
    next: queue[0] ?? null,
    thisWeek,
    hoursLeft,
    weeksLeft: hoursLeft > 0 ? Math.ceil(hoursLeft / profile.hours) : 0,
    totals: { done: total - open.length, total },
  };
}

/** A workflow id from storage, if it still exists. */
export function workflowById(id: string | null | undefined): Workflow | null {
  return id ? WORKFLOW_BY_ID[id] ?? null : null;
}

/** "about 3 weeks", "about 2 months", "under a week". */
export function describeWeeks(weeks: number): string {
  if (weeks <= 0) return 'done';
  if (weeks <= 1) return 'about a week';
  if (weeks < 9) return `about ${weeks} weeks`;
  const months = Math.round(weeks / 4.33);
  return months >= 18 ? `about ${Math.round(months / 12)} years` : `about ${months} months`;
}
