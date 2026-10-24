// The projects board: how far each project's phase has come, sorting and
// search. Pure — the page supplies the rows.

import { computeProgress, type ProjectSignals } from './progress';
import { PHASE_STATUS, type Phase } from './phases';

export interface Readiness {
  phaseLabel: string;
  done: number;
  total: number;
  next: string | null;
  /** Milestones done across every phase, 0–1 — for sorting by how far along. */
  overall: number;
}

/**
 * `phase` is the phase a card sits in when it differs from the status its
 * signals were fetched with (a card just moved); the signals are not changed.
 */
export function readinessOf(s: ProjectSignals | undefined | null, phase?: Phase): Readiness | null {
  if (!s) return null;
  const p = computeProgress(phase ? { ...s, status: PHASE_STATUS[phase] } : s);
  return {
    phaseLabel: p.current.label,
    done: p.current.done,
    total: p.current.total,
    next: p.nextSteps[0]?.label ?? null,
    overall: p.totals.total ? p.totals.done / p.totals.total : 0,
  };
}

/** The progress bar's width, a whole 0–100; null when there is nothing to measure (no milestones, or a bad total). */
export function percentOf(r: Pick<Readiness, 'done' | 'total'> | null | undefined): number | null {
  if (!r || !Number.isFinite(r.total) || r.total <= 0) return null;
  const done = Number.isFinite(r.done) ? r.done : 0;
  return Math.round(Math.min(1, Math.max(0, done / r.total)) * 100);
}

export interface BoardCard {
  title: string;
  description: string;
  type: string;
  team: string[];
  createdAt: string;
  updatedAt: string;
  deadline: string | null;
  readiness: Readiness | null;
}

export type SortKey = 'updated' | 'created' | 'title' | 'deadline' | 'progress';

export const SORTS: { id: SortKey; label: string }[] = [
  { id: 'updated', label: 'Recently active' },
  { id: 'created', label: 'Newest' },
  { id: 'title', label: 'Title A–Z' },
  { id: 'deadline', label: 'Nearest end date' },
  { id: 'progress', label: 'Furthest along' },
];

export function sortProjects<T extends BoardCard>(list: T[], by: SortKey): T[] {
  const out = [...list];
  const time = (d: string | null) => (d ? Date.parse(d) : Number.POSITIVE_INFINITY);
  switch (by) {
    case 'updated': return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    case 'created': return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'title': return out.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    case 'deadline': return out.sort((a, b) => time(a.deadline) - time(b.deadline));
    case 'progress': return out.sort((a, b) => (b.readiness?.overall ?? 0) - (a.readiness?.overall ?? 0));
  }
}

/** Every word of the query appears in the title, logline, format or a teammate's name. */
export function matchesQuery(p: BoardCard, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = `${p.title}\n${p.description}\n${p.type}\n${p.team.join(' ')}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}
