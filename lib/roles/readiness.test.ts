import { describe, it, expect } from 'vitest';
import { EMPTY_SIGNALS, PRODUCTION_VIEWS, type ProjectSignals } from '@/lib/os/progress';
import { DEPARTMENT_WORKFLOWS, STAGES, WORKFLOWS, type Workflow } from './workflows';
import { readiness, readySummary, recordKindsNeeded, stepEvidence } from './readiness';

const all = [...Object.entries(WORKFLOWS), ...Object.entries(DEPARTMENT_WORKFLOWS)];
const ev = (signals: Partial<ProjectSignals> = {}, recordCounts: Record<string, number> = {}) => ({ signals: { ...EMPTY_SIGNALS, ...signals }, recordCounts });

describe('stepEvidence', () => {
  it('maps every tool of every workflow to evidence or an explicit null, without throwing', () => {
    for (const [name, w] of all) for (const st of STAGES) for (const step of w.stages[st] ?? []) {
      if (!step.tool) continue;
      const e = stepEvidence(step.tool);
      if (e?.kind === 'signal') expect(Object.keys(EMPTY_SIGNALS), `${name} ${step.tool}`).toContain(e.key);
      else expect(e === null || e.kind === 'records', `${name} ${step.tool}`).toBe(true);
    }
    for (const v of PRODUCTION_VIEWS) expect(() => stepEvidence(v)).not.toThrow();
  });
  it('maps record tools, project signals, and leaves the rest unknown', () => {
    expect(stepEvidence('permit')).toEqual({ kind: 'records', recordKind: 'permits' });
    expect(stepEvidence('breakdown')).toEqual({ kind: 'signal', key: 'breakdown_elements' });
    expect(stepEvidence('crew')).toEqual({ kind: 'signal', key: 'crew_confirmed' });
    expect(stepEvidence('paperwork')).toBeNull();
    expect(stepEvidence('onset')).toBeNull();
  });
});

describe('readiness', () => {
  const w: Workflow = { stages: { Prep: [{ text: 'Break it down.', tool: 'breakdown' }, { text: 'Scout places.', tool: 'scout' }, { text: 'Write your notes.', tool: 'director' }, { text: 'Get the paperwork.', tool: 'paperwork' }, { text: 'Think it over.' }] }, receives: ['x'], hands: ['y'] };
  it('ticks from real data and never ticks without evidence', () => {
    const rows = readiness(w, 'Prep', ev({ breakdown_elements: 4 }, { directorNotes: 0, scouts: 2 }));
    expect(rows.map((r) => r.done)).toEqual([true, true, false, null, null]);
  });
  it('is unknown, not open, until counts are loaded', () => {
    const rows = readiness(w, 'Prep', { signals: null, recordCounts: {} });
    expect(rows.every((r) => r.done === null)).toBe(true);
    expect(readySummary(rows)).toBeNull();
  });
  it('summarises n of m over the steps that have evidence', () => {
    const rows = readiness(w, 'Prep', ev({ breakdown_elements: 1 }, { directorNotes: 0, scouts: 0 }));
    expect(readySummary(rows)).toEqual({ ready: 1, total: 3 });
  });
  it('lists only the record kinds the steps need', () => {
    expect(recordKindsNeeded(w, ['Prep']).sort()).toEqual(['directorNotes', 'scouts']);
  });
});
