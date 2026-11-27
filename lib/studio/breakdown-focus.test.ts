import { describe, expect, it } from 'vitest';
import { computeProgress, EMPTY_SIGNALS, type ProjectSignals } from '@/lib/os/progress';
import { breakdownFocus, type FocusFacts } from './breakdown-focus';

const DEV_DONE = { logline: true, characters: 1, beats: 3, media: 5 };
const sig = (o: Partial<ProjectSignals>): ProjectSignals => ({ ...EMPTY_SIGNALS, ...o });
const facts = (s: ProjectSignals, o: Partial<FocusFacts> = {}): FocusFacts => ({
  signals: s, progress: computeProgress(s), scriptId: 'sc1', scenes: s.scenes, scenesTagged: s.scenes,
  elements: { total: 0, needed: 0, sourcing: 0, ready: 0, unpriced: 0 },
  budget: { lines: 0, planned: 0, actual: 0, estimate: 0, fromBreakdown: 0 },
  ...o,
});
const ids = (r: ReturnType<typeof breakdownFocus>) => r.items.map((i) => i.id);

describe('breakdownFocus', () => {
  it('waits for the progress read', () => {
    expect(breakdownFocus({ ...facts(sig({})), signals: null, progress: null }).state).toBe('loading');
  });

  it('an empty project is told to start the script, nothing else', () => {
    const r = breakdownFocus(facts(sig({ status: 'concept' })));
    expect(r.state).toBe('empty');
    expect(ids(r)[0]).toBe('script');
    expect(r.items[0].to).toEqual({ place: { kind: 'path', path: '/editor?script=sc1' } });
  });

  it('scenes without a breakdown point at the script, and say how many', () => {
    const s = sig({ status: 'pre-production', scripts: 1, scenes: 4 });
    const r = breakdownFocus(facts(s));
    expect(r.items.find((i) => i.id === 'breakdown')?.detail).toContain('4 scenes');
  });

  it('a partly broken-down script names the untagged scenes, the unready and the unpriced elements', () => {
    const s = sig({ ...DEV_DONE, status: 'pre-production', scripts: 1, scenes: 5, breakdown_elements: 6 });
    const r = breakdownFocus(facts(s, { scenesTagged: 3, elements: { total: 6, needed: 2, sourcing: 1, ready: 3, unpriced: 2 } }));
    expect(ids(r)).toEqual(expect.arrayContaining(['untagged', 'elements', 'unpriced']));
    expect(r.items.find((i) => i.id === 'untagged')?.title).toBe('2 scenes with nothing tagged');
    expect(r.items.find((i) => i.id === 'elements')?.detail).toBe('2 still needed, 1 being sourced, 3 ready.');
    expect(r.items.find((i) => i.id === 'unpriced')?.to).toEqual({ action: 'categories' });
  });

  it('a dated shoot turns an unready element into a blocker; before one it is only next', () => {
    const base = { status: 'pre-production', scripts: 1, scenes: 2, breakdown_elements: 2 } as const;
    const el = { total: 2, needed: 1, sourcing: 0, ready: 1, unpriced: 0 };
    expect(breakdownFocus(facts(sig(base), { elements: el })).items.find((i) => i.id === 'elements')?.kind).toBe('next');
    const dated = breakdownFocus(facts(sig({ ...base, shoot_start: '2027-01-10' }), { elements: el }));
    expect(dated.items.find((i) => i.id === 'elements')?.kind).toBe('blocker');
    expect(dated.state).toBe('blocked');
    expect(dated.items[0].kind).toBe('blocker');
  });

  it('over budget is a blocker that opens Money; an unpushed estimate offers Push to budget in place', () => {
    const s = sig({ status: 'pre-production', scripts: 1, scenes: 2, breakdown_elements: 2, budget_lines: 3 });
    const r = breakdownFocus(facts(s, {
      elements: { total: 2, needed: 0, sourcing: 0, ready: 2, unpriced: 0 },
      budget: { lines: 3, planned: 1000, actual: 1400, estimate: 800, fromBreakdown: 500 },
    }));
    const over = r.items.find((i) => i.id === 'over-budget')!;
    expect(over.kind).toBe('blocker');
    expect(over.detail).toBe('$1,400 spent against $1,000 planned, $400 over.');
    expect(over.to).toEqual({ place: { kind: 'studio', tab: 'production', view: 'money' } });
    expect(r.items.find((i) => i.id === 'budget-sync')?.to).toEqual({ action: 'push-budget' });
    // Its label must differ from the toolbar's own "Push to budget" button: both are on the Breakdown tab
    // at once, and two buttons with one name are a strict-mode failure (and a voice-control trap).
    expect(r.items.find((i) => i.id === 'budget-sync')?.actionLabel).toBe('Push estimate to budget');
  });

  it('a budget that matches the breakdown asks for nothing', () => {
    const s = sig({ status: 'pre-production', scripts: 1, scenes: 1, breakdown_elements: 1, budget_lines: 1 });
    const r = breakdownFocus(facts(s, { elements: { total: 1, needed: 0, sourcing: 0, ready: 1, unpriced: 0 }, budget: { lines: 1, planned: 500, actual: 0, estimate: 500, fromBreakdown: 500 } }));
    expect(ids(r)).not.toContain('budget-sync');
    expect(ids(r)).not.toContain('over-budget');
  });

  it('work left behind in an earlier phase blocks; the current phase only comes next', () => {
    const s = sig({ ...DEV_DONE, status: 'production', scripts: 1, scenes: 3, scenes_wrapped: 1, breakdown_elements: 4, locations: 2, locations_confirmed: 1, permits_open: 0, crew_confirmed: 1, revisions: 1, castings: 1, shots: 1, budget_lines: 1, budget_approved: true, call_sheets: 1, call_sheets_issued: 1 });
    const r = breakdownFocus(facts(s, { elements: { total: 4, needed: 0, sourcing: 0, ready: 4, unpriced: 0 } }));
    const loc = r.items.find((i) => i.id === 'locations')!;
    expect(loc.kind).toBe('blocker');
    expect(loc.detail).toBe('1 of 2 locations confirmed.');
    expect(loc.to).toEqual({ place: { kind: 'studio', tab: 'production', view: 'locations' } });
    expect(r.items.find((i) => i.id === 'wrap-all')?.kind).toBe('next');
    expect(r.items[0].id).toBe('locations');
    expect(r.items.length).toBeLessThanOrEqual(5);
    expect(r.more).toBeGreaterThanOrEqual(0);
  });

  it('never shows a later phase’s milestones', () => {
    const s = sig({ status: 'concept', scripts: 1, scenes: 1 });
    const r = breakdownFocus(facts(s));
    expect(ids(r)).not.toEqual(expect.arrayContaining(['cut', 'deliverables']));
    expect(r.context.startsWith('Development')).toBe(true);
  });

  it('a locked cut stops the breakdown asking for work', () => {
    const s = sig({ status: 'post', scripts: 1, scenes: 3, scenes_wrapped: 3, breakdown_elements: 4, cuts: 1, cuts_locked: 1 });
    const r = breakdownFocus(facts(s, { scenesTagged: 1, elements: { total: 4, needed: 3, sourcing: 0, ready: 1, unpriced: 4 } }));
    expect(ids(r)).not.toEqual(expect.arrayContaining(['untagged', 'unpriced', 'budget-sync']));
  });

  it('a notes-and-files project (no phases) gets no checklist', () => {
    const s = sig({ status: 'concept', format: { phase_labels: {}, skip_phases: [], skip_milestones: [], phased: false } });
    const r = breakdownFocus(facts(s));
    expect(r.state).toBe('unphased');
    expect(r.items).toEqual([]);
  });

  it('a format that skips a milestone never asks for it', () => {
    const s = sig({
      status: 'pre-production', scripts: 1, scenes: 1, breakdown_elements: 1,
      format: { phase_labels: {}, skip_phases: [], skip_milestones: ['locations', 'permits', 'casting'] },
    });
    const r = breakdownFocus(facts(s, { elements: { total: 1, needed: 0, sourcing: 0, ready: 1, unpriced: 0 } }));
    expect(ids(r)).not.toEqual(expect.arrayContaining(['locations']));
    expect(ids(r)).not.toContain('casting');
    expect(ids(r)).not.toContain('permits');
  });

  it('a format that skips the breakdown milestone shows no breakdown items', () => {
    const s = sig({ status: 'pre-production', scripts: 1, scenes: 2, format: { phase_labels: {}, skip_phases: [], skip_milestones: ['breakdown', 'budget'] } });
    const r = breakdownFocus(facts(s));
    expect(ids(r)).not.toContain('breakdown');
  });

  it('everything done says so and names the next phase', () => {
    const s = sig({ status: 'concept', logline: true, scripts: 1, characters: 1, scenes: 1, beats: 3, media: 5 });
    const r = breakdownFocus(facts(s));
    expect(r.state).toBe('clear');
    expect(r.headline).toContain('Ready to move on to Pre-Production');
  });

  it('casting is listed once: the stricter read speaks, with the real numbers', () => {
    const s = sig({ ...DEV_DONE, status: 'pre-production', scripts: 1, scenes: 2, characters: 2, cast_roles: 2, cast_roles_cast: 0, castings: 0, locations: 2, locations_confirmed: 2, permits_open: 0, shots: 1, crew_confirmed: 1, breakdown_elements: 4 });
    const r = breakdownFocus(facts(s, { elements: { total: 4, needed: 0, sourcing: 0, ready: 4, unpriced: 0 } }));
    expect(ids(r)).toContain('casting-complete');
    expect(ids(r)).not.toContain('casting');
    expect(r.items.find((i) => i.id === 'casting-complete')?.detail).toBe('0 of 2 characters in a scene cast.');
  });

  it('a partly cast film still hears only the stricter read', () => {
    const s = sig({ ...DEV_DONE, status: 'pre-production', scripts: 1, scenes: 2, characters: 2, cast_roles: 2, cast_roles_cast: 1, castings: 1, locations: 2, locations_confirmed: 2, permits_open: 0, shots: 1, crew_confirmed: 1, breakdown_elements: 4 });
    const r = breakdownFocus(facts(s, { elements: { total: 4, needed: 0, sourcing: 0, ready: 4, unpriced: 0 } }));
    expect(ids(r)).not.toContain('casting');
    expect(r.items.find((i) => i.id === 'casting-complete')?.detail).toBe('1 of 2 characters in a scene cast.');
  });
});
