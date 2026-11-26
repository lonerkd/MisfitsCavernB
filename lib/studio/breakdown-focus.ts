// What is blocking, and what is next — the lead of the Breakdown tab. Pure: the project's progress (its phase, the milestones its format
// keeps) plus what the breakdown itself knows (scenes tagged, elements still needed or unpriced, the cost against the budget). Every item
// names a precise action and where it is fixed; nothing is ticked by hand, and a project whose format has no phases gets no checklist.

import type { Place, ProjectProgress, ProjectSignals } from '@/lib/os/progress';

export type FocusAction = 'push-budget' | 'categories' | 'needed';

export interface FocusItem {
  id: string;
  /** A blocker holds the project back (left behind from an earlier phase, over budget, elements missing on the shoot); a next is the following step. */
  kind: 'blocker' | 'next';
  title: string;
  /** The precise state, in the project's own numbers. */
  detail: string;
  /** Where it is fixed: another tool, or an action inside the Breakdown tab. */
  to: { place: Place } | { action: FocusAction };
  actionLabel: string;
}

export type FocusState = 'unphased' | 'loading' | 'empty' | 'blocked' | 'next' | 'clear';

export interface BreakdownFocus {
  state: FocusState;
  headline: string;
  /** "Pre-Production · 4 of 11": the phase and its milestones, as context rather than the lead. */
  context: string;
  blockers: number;
  /** At most five, blockers first. */
  items: FocusItem[];
  /** Items past the five shown. */
  more: number;
}

export interface FocusFacts {
  signals: ProjectSignals | null;
  progress: ProjectProgress | null;
  /** The script the Studio is on, for "tag it in the script". */
  scriptId: string | null;
  scenes: number;
  /** Scenes with at least one element tagged. */
  scenesTagged: number;
  elements: { total: number; needed: number; sourcing: number; ready: number; unpriced: number };
  /** `estimate` is what the breakdown costs; `fromBreakdown` is what its pushed lines add up to in the budget. */
  budget: { lines: number; planned: number; actual: number; estimate: number; fromBreakdown: number };
}

const MAX = 5;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export function breakdownFocus(f: FocusFacts): BreakdownFocus {
  const { signals: s, progress: p } = f;
  if (!s || !p) return { state: 'loading', headline: 'Reading where the project stands…', context: '', blockers: 0, items: [], more: 0 };
  if (!p.phased) {
    return { state: 'unphased', headline: 'This project has no phases, so there is no readiness checklist.', context: '', blockers: 0, items: [], more: 0 };
  }

  const cur = p.currentIndex;
  const phaseAt = (id: string) => p.phases.findIndex((ph) => ph.milestones.some((m) => m.id === id));

  // Left behind from an earlier phase, and one that gates the shoot (the creative groundwork in Development is a next step, never a blocker).
  const behind = (id: string) => phaseAt(id) >= 0 && phaseAt(id) < cur && p.phases[phaseAt(id)].id !== 'development';
  // The breakdown's own work belongs to Pre-Production on; earlier it only shows once someone has started it.
  const started = (id: string) => phaseAt(id) >= 0 && (phaseAt(id) <= cur || f.elements.total > 0);
  const cutLocked = s.cuts_locked > 0; // the film is finished on a locked cut: the breakdown stops asking for work
  const items: FocusItem[] = [];
  const add = (i: FocusItem) => { if (!items.some((x) => x.id === i.id)) items.push(i); };
  const kind = (id: string): FocusItem['kind'] => (behind(id) ? 'blocker' : 'next');
  const scriptPath: Place = { kind: 'path', path: f.scriptId ? `/editor?script=${f.scriptId}` : '/editor' };
  const phaseId = p.phases[cur].id;

  // 1. Nothing written yet: the one step that matters.
  if (s.scripts === 0 || f.scenes === 0) {
    add({
      id: 'script', kind: 'next', title: 'Start with the script',
      detail: s.scripts === 0 ? 'No script yet. Its scene headings become the scenes this breakdown is read from.' : 'The script has no scene headings yet (INT. or EXT.).',
      to: { place: scriptPath }, actionLabel: 'Open the script',
    });
  } else if (started('breakdown') && !cutLocked) {
    // 2. The breakdown itself.
    const untagged = f.scenes - f.scenesTagged;
    if (f.elements.total === 0) {
      add({
        id: 'breakdown', kind: kind('breakdown'), title: 'Break the script down',
        detail: `${plural(f.scenes, 'scene')}, nothing tagged. Select the words a scene needs in the script (Ctrl+Shift+B).`,
        to: { place: scriptPath }, actionLabel: 'Tag it in the script',
      });
    } else {
      if (untagged > 0) {
        add({
          id: 'untagged', kind: 'next', title: `${plural(untagged, 'scene')} with nothing tagged`,
          detail: `${f.scenesTagged} of ${f.scenes} scenes are broken down. A scene nobody tagged reads as needing nothing.`,
          to: { place: scriptPath }, actionLabel: 'Tag them in the script',
        });
      }
      const open = f.elements.needed + f.elements.sourcing;
      if (open > 0) {
        // Once the shoot is near, an element still not ready is what stops a day.
        const hard = phaseId === 'production' || (phaseId === 'pre-production' && !!s.shoot_start);
        add({
          id: 'elements', kind: hard ? 'blocker' : 'next', title: `${plural(open, 'element')} not ready`,
          detail: `${f.elements.needed} still needed, ${f.elements.sourcing} being sourced, ${f.elements.ready} ready.`,
          to: { action: 'needed' }, actionLabel: 'Show what is missing',
        });
      }
      if (f.elements.unpriced > 0) {
        add({
          id: 'unpriced', kind: 'next', title: `${plural(f.elements.unpriced, 'element')} with no price`,
          detail: 'They count as zero in the estimate. Price each one, or set a unit cost for its category.',
          to: { action: 'categories' }, actionLabel: 'Set unit costs',
        });
      }
    }
  }

  // 3. Money, from the breakdown's own numbers.
  const b = f.budget;
  if (started('budget') && f.elements.total > 0) {
    if (b.planned > 0 && b.actual > b.planned) {
      add({
        id: 'over-budget', kind: 'blocker', title: 'Over budget',
        detail: `${money(b.actual)} spent against ${money(b.planned)} planned, ${money(b.actual - b.planned)} over.`,
        to: { place: { kind: 'studio', tab: 'production', view: 'money' } }, actionLabel: 'Open Money',
      });
    }
    if (b.estimate > 0 && !cutLocked && Math.round(b.fromBreakdown) !== Math.round(b.estimate)) {
      add({
        id: 'budget-sync', kind: kind('budget'),
        title: b.lines === 0 ? 'Set a budget' : 'The budget is out of step with the breakdown',
        detail: b.lines === 0
          ? `The breakdown estimates ${money(b.estimate)}. Push it to start the budget.`
          : `The breakdown estimates ${money(b.estimate)}; its lines in the budget add up to ${money(b.fromBreakdown)}.`,
        to: { action: 'push-budget' }, actionLabel: 'Push estimate to budget',
      });
    }
  }

  // 4. What the other milestones of this phase, and of the earlier ones, still owe: each with its own numbers and its own tool.
  const detailOf = (id: string, hint: string): string => {
    switch (id) {
      case 'locations': return `${s.locations_confirmed} of ${s.locations} locations confirmed.`;
      case 'permits': return `${plural(s.permits_open, 'location')} still need or wait on a permit.`;
      case 'casting': return `${plural(s.characters, 'character')}, none cast.`;
      case 'shots': return 'No shots planned yet.';
      case 'schedule': return 'No shoot day has a date.';
      case 'call-sheet': return 'No call sheet issued to the crew yet.';
      case 'lock-script': return 'The script is not locked, so later changes would not show as revision pages.';
      case 'budget-approved': return 'The owner has not approved the budget.';
      case 'wrap-all': return `${s.scenes_wrapped} of ${s.scenes} scenes wrapped.`;
      case 'notes-resolved': return `${plural(s.post_notes_open, 'note')} still open.`;
      case 'cut-locked': return 'No cut is locked.';
      case 'crew': return s.crew > 0 ? `${plural(s.crew, 'person', 'people')} invited, nobody has accepted yet.` : hint;
      default: return hint;
    }
  };
  const handled = new Set(['script', 'breakdown', 'budget']); // above, with the breakdown's own numbers
  for (const ph of p.phases.slice(0, cur + 1)) {
    for (const m of ph.milestones) {
      if (m.done || handled.has(m.id)) continue;
      add({ id: m.id, kind: kind(m.id), title: m.label, detail: detailOf(m.id, m.hint), to: { place: m.place }, actionLabel: placeLabel(m.place) });
    }
  }

  items.sort((x, y) => (x.kind === y.kind ? 0 : x.kind === 'blocker' ? -1 : 1));
  const blockers = items.filter((i) => i.kind === 'blocker').length;
  const phase = p.current;
  const context = `${phase.label} · ${phase.done} of ${phase.total}`;
  if (items.length === 0) {
    return {
      state: 'clear', context, blockers: 0, items: [], more: 0,
      headline: p.next ? `Nothing is blocking ${phase.label}. Ready to move on to ${p.next.label}.` : `Nothing is blocking ${phase.label}.`,
    };
  }
  return {
    state: f.scenes === 0 ? 'empty' : blockers > 0 ? 'blocked' : 'next',
    context, blockers, items: items.slice(0, MAX), more: Math.max(0, items.length - MAX),
    headline: blockers > 0 ? `${plural(blockers, 'thing')} blocking ${phase.label}` : `Next in ${phase.label}`,
  };
}

function placeLabel(place: Place): string {
  if (place.kind === 'hub') return 'Open the project page';
  if (place.kind === 'path') return 'Open';
  switch (place.view) {
    case 'money': return 'Open Money';
    case 'locations': return 'Open Locations';
    case 'schedule': return 'Open the schedule';
    case 'crew': return 'Open Cast & crew';
    case 'paperwork': return 'Open Paperwork';
    case 'revisions': return 'Open Script revisions';
    case 'story': return 'Open the beat board';
    default: break;
  }
  if (place.tab === 'scenes') return 'Open Scenes';
  if (place.tab === 'post') return 'Open Post';
  if (place.tab === 'library') return 'Open the Library';
  if (place.tab === 'share') return 'Open Share';
  return 'Open';
}
