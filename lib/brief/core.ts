// The project brief and what it means for the rest of the suite.
//
// The brief is a project's answers to the catalogue in public.brief_questions
// — choices, not free text — collected phase by phase. Read together with
// what the suite already knows (public.project_context: scenes, locations,
// crew, breakdown, casting; the script's measured runtime), it tells each
// tool what this project needs: roles to fill, breakdown categories to watch,
// a shooting pace, channels to open — and what to do next (nextMoves).
//
// Nothing here knows a question, genre or craft by name except the handful
// of keys the analysis reads (target_runtime, shoot_days, goal, …); options
// carry their own implications as data.

import { PHASES, type Phase } from '@/lib/os/phases';

export interface Implies {
  crafts?: string[];
  breakdown?: string[];
  channels?: string[];
  pages_per_day?: number;
}

export interface BriefOption { id: string; label: string; hint?: string; implies?: Implies }

export interface BriefQuestion {
  key: string;
  phase: Phase;
  label: string;
  hint: string;
  kind: 'one' | 'many' | 'number';
  options: BriefOption[];
  unit: string | null;
  min_value: number | null;
  max_value: number | null;
  ask_when: { formats?: string[]; not_formats?: string[]; answer?: Record<string, string[]> };
  position: number;
}

export type BriefValue = string | string[] | number;
export type Answers = Record<string, BriefValue>;

/** From public.project_context(project). */
export interface ProjectContext {
  scenes: number;
  exteriors: number;
  night_exteriors: number;
  locations: number;
  scenes_with_refs: number;
  shoot_days: number;
  characters: number;
  cast: number;
  crafts: string[];
  crew: number;
  viewers: number;
  breakdown: Record<string, { label: string; n: number }>;
  channels: string[];
  budget: number;
}

export const EMPTY_CONTEXT: ProjectContext = {
  scenes: 0, exteriors: 0, night_exteriors: 0, locations: 0, scenes_with_refs: 0, shoot_days: 0,
  characters: 0, cast: 0, crafts: [], crew: 0, viewers: 0, breakdown: {}, channels: [], budget: 0,
};

/** The project's main script, measured (lib/scriptos/timing). */
export interface ScriptFacts { pages: number; runtimeSeconds: number }

const phaseIndex = (p: Phase) => PHASES.findIndex((x) => x.id === p);

/** The chosen option ids of an answer (a number has none). */
export function chosen(value: BriefValue | undefined): string[] {
  if (value == null || typeof value === 'number') return [];
  return Array.isArray(value) ? value : [value];
}

/** Whether a question applies to this project (its format, earlier answers). */
export function isAsked(q: BriefQuestion, answers: Answers, format: string | null): boolean {
  const w = q.ask_when ?? {};
  if (w.formats?.length && !(format && w.formats.includes(format))) return false;
  if (w.not_formats?.length && format && w.not_formats.includes(format)) return false;
  for (const [key, ids] of Object.entries(w.answer ?? {})) {
    if (!chosen(answers[key]).some((id) => ids.includes(id))) return false;
  }
  return true;
}

export function visibleQuestions(questions: BriefQuestion[], answers: Answers, format: string | null): BriefQuestion[] {
  return questions
    .filter((q) => isAsked(q, answers, format))
    .sort((a, b) => phaseIndex(a.phase) - phaseIndex(b.phase) || a.position - b.position);
}

export interface Implications {
  crafts: string[];
  breakdown: string[];
  channels: string[];
  pagesPerDay: number | null;
  /** For each craft / category / channel: the choices that call for it. */
  because: Record<string, string[]>;
}

/** What the answered questions imply, with the choices behind each. */
export function implications(questions: BriefQuestion[], answers: Answers, format: string | null): Implications {
  const crafts = new Set<string>();
  const breakdown = new Set<string>();
  const channels = new Set<string>();
  const because: Record<string, string[]> = {};
  const note = (k: string, why: string) => { const w = (because[k] ??= []); if (!w.includes(why)) w.push(why); };
  let pace: number | null = null;
  for (const q of visibleQuestions(questions, answers, format)) {
    const ids = chosen(answers[q.key]);
    for (const o of q.options.filter((o) => ids.includes(o.id))) {
      const im = o.implies ?? {};
      for (const c of im.crafts ?? []) { crafts.add(c); note(`craft:${c}`, o.label); }
      for (const b of im.breakdown ?? []) { breakdown.add(b); note(`breakdown:${b}`, o.label); }
      for (const ch of im.channels ?? []) { channels.add(ch); note(`channel:${ch}`, o.label); }
      if (typeof im.pages_per_day === 'number' && im.pages_per_day > 0) pace = im.pages_per_day;
    }
  }
  return { crafts: [...crafts], breakdown: [...breakdown], channels: [...channels], pagesPerDay: pace, because };
}

/** How many of the questions that apply so far are answered. */
export function briefProgress(questions: BriefQuestion[], answers: Answers, format: string | null, upTo?: Phase) {
  const limit = upTo ? phaseIndex(upTo) : PHASES.length - 1;
  const asked = visibleQuestions(questions, answers, format).filter((q) => phaseIndex(q.phase) <= limit);
  return { answered: asked.filter((q) => answers[q.key] != null).length, of: asked.length };
}

/** A short line that says what the project is: "Horror · Dark · 12 min". */
export function briefSummary(questions: BriefQuestion[], answers: Answers, format: string | null, keys = ['genre', 'tone', 'target_runtime', 'goal']): string {
  const byKey = new Map(questions.map((q) => [q.key, q]));
  const parts: string[] = [];
  for (const k of keys) {
    const q = byKey.get(k);
    const v = answers[k];
    if (!q || v == null || !isAsked(q, answers, format)) continue;
    if (typeof v === 'number') parts.push(`${v} ${q.unit === 'minutes' ? 'min' : q.unit ?? ''}`.trim());
    else parts.push(chosen(v).map((id) => q.options.find((o) => o.id === id)?.label ?? id).join(', '));
  }
  return parts.join(' · ');
}

export const shootDaysNeeded = (pages: number, pagesPerDay: number) => Math.max(1, Math.ceil(pages / pagesPerDay));

export type MoveKind = 'ask' | 'warn' | 'gap' | 'tip';

export interface Move {
  id: string;
  kind: MoveKind;
  title: string;
  detail: string;
  /** Where to act on it (a path in the suite). */
  href?: string;
  action?: string;
  /** For `ask`: the question to answer. */
  question?: string;
  /** For role gaps: the crafts to fill. */
  crafts?: string[];
  /** For channel tips: the presets to open. */
  channels?: string[];
  weight: number;
}

export interface MoveInput {
  questions: BriefQuestion[];
  answers: Answers;
  format: string | null;
  phase: Phase;
  context: ProjectContext;
  script: ScriptFacts | null;
}

const minutes = (s: number) => Math.round(s / 60);
const pct = (x: number) => Math.round(Math.abs(x - 1) * 100);
const list = (xs: string[]) => (xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * What would move the project forward now, most useful first: questions for
 * this phase, the script against its target, the shoot against its pace,
 * roles and breakdown the brief calls for, scenes without references,
 * characters without cast, channels to open.
 */
export function nextMoves({ questions, answers, format, phase, context: c, script }: MoveInput): Move[] {
  const now = phaseIndex(phase);
  const at = (p: Phase) => phaseIndex(p);
  const moves: Move[] = [];
  const im = implications(questions, answers, format);
  const num = (k: string) => (typeof answers[k] === 'number' ? (answers[k] as number) : null);
  const goals = chosen(answers.goal);

  // Questions for this phase (and a look at the next).
  for (const q of visibleQuestions(questions, answers, format)) {
    if (answers[q.key] != null) continue;
    const d = at(q.phase) - now;
    if (d > 1) continue;
    moves.push({
      id: `ask:${q.key}`, kind: 'ask', question: q.key, title: q.label,
      detail: q.hint || 'Answer it and the suite fits itself to the project.',
      weight: (d <= 0 ? 60 : 25) - q.position / 100,
    });
  }

  // The script against the length you're aiming for.
  const target = num('target_runtime');
  if (target && script && script.pages >= 1) {
    const ratio = script.runtimeSeconds / (target * 60);
    if (ratio > 1.15 || ratio < 0.85) {
      moves.push({
        id: 'runtime', kind: 'warn', href: '/editor', action: 'Open the script',
        title: `The script runs about ${minutes(script.runtimeSeconds)} min — ${pct(ratio)}% ${ratio > 1 ? 'over' : 'under'} your ${target}-minute target`,
        detail: ratio > 1 ? 'About a minute a page. Trim, or change the target in the brief.' : 'Room to grow — or change the target in the brief.',
        weight: now <= at('pre-production') ? 70 : 30,
      });
    }
  }
  if (goals.includes('festivals') && format === 'Short Film') {
    const length = target ?? (script ? minutes(script.runtimeSeconds) : 0);
    if (length > 40) {
      moves.push({
        id: 'short-length', kind: 'warn', title: 'Most festivals count a short as 40 minutes or less, credits included',
        detail: `This one is aiming for ${length} minutes.`, weight: 55,
      });
    }
  }

  // The shoot against the pace your budget allows.
  if (im.pagesPerDay && script && script.pages >= 1 && now >= at('pre-production')) {
    const need = shootDaysNeeded(script.pages, im.pagesPerDay);
    const planned = num('shoot_days');
    if (planned && need > planned * 1.1) {
      moves.push({
        id: 'shoot-days', kind: 'warn', href: '/studio?tab=production&view=schedule', action: 'Open the schedule',
        title: `At about ${im.pagesPerDay} pages a day the script needs around ${plural(need, 'shooting day')} — you’ve planned ${planned}`,
        detail: 'Add days, cut pages, or shoot faster (fewer setups per scene).', weight: 65,
      });
    } else if (!planned) {
      moves.push({
        id: 'shoot-days', kind: 'tip', href: '/studio?tab=production&view=schedule', action: 'Open the schedule',
        title: `At about ${im.pagesPerDay} pages a day the script needs around ${plural(need, 'shooting day')}`,
        detail: `${script.pages.toFixed(1)} pages at your budget’s pace.`, weight: 35,
      });
    }
  }

  // Roles the brief calls for that nobody on the crew does yet.
  const have = new Set(c.crafts);
  const missing = im.crafts.filter((cr) => !have.has(cr));
  if (missing.length) {
    const why = [...new Set(missing.flatMap((cr) => im.because[`craft:${cr}`] ?? []))];
    moves.push({
      id: 'roles', kind: 'gap', crafts: missing, href: '/studio?tab=production&view=crew', action: 'Open the crew',
      title: `Roles this project needs: ${list(missing)}`,
      detail: `Because of ${list(why)}. Invite someone, or post the role on Jobs.`,
      weight: now >= at('pre-production') ? 62 : 20,
    });
  }

  // Breakdown categories the brief says matter, with nothing tagged yet.
  if (c.scenes > 0 && now >= at('pre-production')) {
    const empty = im.breakdown.filter((k) => c.breakdown[k] && c.breakdown[k].n === 0);
    if (empty.length) {
      const labels = empty.map((k) => c.breakdown[k].label);
      moves.push({
        id: 'breakdown', kind: 'gap', href: '/studio?tab=production&view=breakdown', action: 'Open the breakdown',
        title: `Nothing tagged under ${list(labels)} yet`,
        detail: `Your brief calls for ${list([...new Set(empty.flatMap((k) => im.because[`breakdown:${k}`] ?? []))])}. Tag them in the script so the schedule and budget see them.`,
        weight: 50,
      });
    }
  }

  // Night exteriors need light and short nights.
  if (c.night_exteriors > 0 && c.night_exteriors / Math.max(1, c.scenes) >= 0.2 && now >= at('development') && !have.has('Gaffer')) {
    moves.push({
      id: 'night', kind: 'warn', href: '/studio?tab=production&view=crew', action: 'Open the crew',
      title: `${plural(c.night_exteriors, 'night exterior')} in the script`,
      detail: `${Math.round((c.night_exteriors / c.scenes) * 100)}% of the scenes. Plan lighting (a gaffer) and shorter shooting nights.`,
      weight: now >= at('pre-production') ? 45 : 15,
    });
  }

  // Scenes without a single reference.
  if (c.scenes >= 3 && now <= at('pre-production')) {
    const without = c.scenes - c.scenes_with_refs;
    if (without / c.scenes > 0.5) {
      moves.push({
        id: 'references', kind: 'gap', href: '/studio?tab=scenes', action: 'Open scenes',
        title: `${without} of ${plural(c.scenes, 'scene')} have no references`,
        detail: 'A frame, a location photo, a clip — the look everyone works toward.', weight: 30,
      });
    }
  }

  // Characters without an actor.
  if (c.characters > c.cast && now >= at('pre-production') && format !== 'Podcast') {
    const n = c.characters - c.cast;
    moves.push({
      id: 'casting', kind: 'gap', href: '/studio?tab=production&view=crew', action: 'Cast',
      title: `${plural(n, 'character')} not cast yet`, detail: 'Match characters to people on the crew.', weight: 40,
    });
  }

  // Channels the brief calls for that the project doesn't have.
  const open = new Set(c.channels);
  const wanted = im.channels.filter((ch) => !open.has(ch));
  if (wanted.length && c.crew > 0) {
    moves.push({
      id: 'channels', kind: 'tip', channels: wanted, href: '/lounge', action: 'Open the Lounge',
      title: `Open ${list(wanted.map((w) => `#${w}`))} in the Lounge`,
      detail: `Because of ${list([...new Set(wanted.flatMap((w) => im.because[`channel:${w}`] ?? []))])}.`,
      weight: now >= at('production') ? 45 : 15,
    });
  }

  // Delivery: a vertical cut, and music cleared for where it's going.
  const platforms = chosen(answers.platforms);
  const aspect = chosen(answers.aspect)[0];
  if (platforms.includes('social') && aspect && aspect !== 'vertical' && aspect !== 'square') {
    moves.push({ id: 'vertical', kind: 'tip', title: 'Plan a vertical cut for Instagram / TikTok', detail: 'Frame key moments with room to crop to 9:16.', weight: now >= at('production') ? 30 : 12 });
  }
  const music = chosen(answers.music)[0];
  if ((music === 'licensed' || music === 'mix') && (goals.includes('distribution') || goals.includes('online')) && now >= at('post-production')) {
    moves.push({
      id: 'music-rights', kind: 'warn', title: 'Clear licensed music for release, not just festivals',
      detail: 'Festival-only licences are cheaper but don’t cover online or sales.', weight: 50,
    });
  }

  return moves.sort((a, b) => b.weight - a.weight);
}

/** A Lounge channel a production tends to want (public.channel_presets). */
export interface ChannelPreset {
  key: string;
  name: string;
  type: 'text' | 'voice' | 'guide';
  audience: 'team' | 'owners' | 'above' | 'below' | 'guests' | 'public';
  post_policy: 'viewers' | 'members' | 'managers';
  topic: string;
  phase: Phase;
  why: string;
  position: number;
}

/**
 * The presets that fit the project now: reached their phase (or the brief
 * asks for them), not open yet, and with someone to be in them (a guests
 * room only once someone is added as a viewer).
 */
export function suggestChannels(presets: ChannelPreset[], opts: { phase: Phase; context: ProjectContext; implied: string[] }): ChannelPreset[] {
  const now = phaseIndex(opts.phase);
  const open = new Set(opts.context.channels.map((n) => n.toLowerCase()));
  return presets
    .filter((p) => phaseIndex(p.phase) <= now || opts.implied.includes(p.key))
    .filter((p) => !open.has(p.name.toLowerCase()))
    .filter((p) => p.audience !== 'guests' || opts.context.viewers > 0)
    .sort((a, b) => a.position - b.position);
}

/**
 * A job post for a role the brief calls for, written from what the project
 * is: the format and brief, why the role is needed, and the script's size.
 */
export function rolePost(craft: string, o: { projectTitle: string; questions: BriefQuestion[]; answers: Answers; format: string | null; context: ProjectContext; script: ScriptFacts | null }) {
  const im = implications(o.questions, o.answers, o.format);
  const summary = briefSummary(o.questions, o.answers, o.format, ['genre', 'tone', 'target_runtime']);
  const lines = [
    `${o.format ?? 'Project'}${summary ? ` — ${summary}` : ''}: “${o.projectTitle}”.`,
  ];
  const why = im.because[`craft:${craft}`];
  if (why?.length) lines.push(`Why we need a ${craft.toLowerCase()}: ${list(why)}.`);
  const facts: string[] = [];
  if (o.script && o.script.pages >= 1) facts.push(`${o.script.pages.toFixed(0)} pages`);
  if (o.context.scenes) facts.push(plural(o.context.scenes, 'scene'));
  if (o.context.locations) facts.push(plural(o.context.locations, 'location'));
  if (o.context.night_exteriors) facts.push(plural(o.context.night_exteriors, 'night exterior'));
  if (typeof o.answers.shoot_days === 'number') facts.push(`${plural(o.answers.shoot_days, 'shooting day')} planned`);
  if (facts.length) lines.push(`${facts.join(', ')}.`);
  return { title: `${craft} — ${o.projectTitle}`, role: craft, description: lines.join('\n') };
}

export function rolePostHref(post: { title: string; role: string; description: string }) {
  return `/jobs?${new URLSearchParams({ title: post.title, role: post.role, description: post.description }).toString()}`;
}
