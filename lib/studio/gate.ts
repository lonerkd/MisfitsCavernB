// The phase gate, pure: what the dialog lists and what each item defaults to.
// Leaving a phase, the owner decides for each library item still in play:
// carry it forward or archive it (archived is kept, hidden by default and off
// the public share link — never deleted). Production and everything after it
// keep real footage, so those phases default to archive; earlier phases
// default to carrying everything forward.

import type { Phase } from '@/lib/os/phases';

export type GateAction = 'carry' | 'archive';
export interface GateItem { id: string; title: string; kind: string; shared: boolean; lifecycle: string }
export interface GateDecision { id: string; action: GateAction }

const KEEP_ALL: readonly Phase[] = ['production', 'post-production', 'delivery'];

/** What an item defaults to when leaving `from`. */
export function defaultAction(from: Phase): GateAction {
  return KEEP_ALL.includes(from) ? 'archive' : 'carry';
}

/** The items the gate asks about: everything not already archived, by title. */
export function gateItems<T extends GateItem>(items: T[]): T[] {
  return items.filter((m) => m.lifecycle !== 'archived').sort((a, b) => (a.title || '').localeCompare(b.title || ''));
}

/** The decisions to send: one per listed item. */
export function toDecisions(items: GateItem[], choice: Record<string, GateAction>, from: Phase): GateDecision[] {
  const fallback = defaultAction(from);
  return items.map((m) => ({ id: m.id, action: choice[m.id] ?? fallback }));
}

/** One database call can carry at most this many exceptions. */
export const MAX_EXCEPTIONS = 1000;

/**
 * The choices as the database takes them: a default plus the exceptions to it.
 * Normally "carry on, except archive these" — so anything added while the
 * dialog was open is safe. Only when more than 1,000 are archived does it flip
 * to "archive, except carry these" (still one atomic step).
 */
export function toBulk(decisions: GateDecision[]): { default: GateAction; exceptions: string[]; tooMany: boolean } {
  const archive = decisions.filter((d) => d.action === 'archive').map((d) => d.id);
  const carry = decisions.filter((d) => d.action === 'carry').map((d) => d.id);
  if (archive.length <= MAX_EXCEPTIONS) return { default: 'carry', exceptions: archive, tooMany: false };
  if (carry.length <= MAX_EXCEPTIONS) return { default: 'archive', exceptions: carry, tooMany: false };
  return { default: 'carry', exceptions: [], tooMany: true };
}

/** What passing the gate will do, in words for the confirm button's hint. */
export function summarize(decisions: GateDecision[], items: GateItem[]): { carried: number; archived: number; unpublished: number } {
  const byId = new Map(items.map((m) => [m.id, m]));
  const archived = decisions.filter((d) => d.action === 'archive');
  return {
    carried: decisions.length - archived.length,
    archived: archived.length,
    unpublished: archived.filter((d) => byId.get(d.id)?.shared).length,
  };
}
