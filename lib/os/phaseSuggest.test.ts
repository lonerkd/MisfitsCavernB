import { describe, it, expect } from 'vitest';
import { computeProgress, suggestPhase, toolState, toSignals, EMPTY_SIGNALS, type ProjectSignals } from './progress';

const signals = (patch: Partial<ProjectSignals> = {}): ProjectSignals => ({ ...EMPTY_SIGNALS, status: 'concept', project_type: 'Feature', ...patch });
const suggest = (s: ProjectSignals, today = '2026-10-01') => suggestPhase(s, computeProgress(s), today);

describe('suggesting the next phase from the project’s data', () => {
  it('says nothing for a project that is where its data says', () => {
    expect(suggest(signals({ scripts: 1, scenes: 4 }))).toBeNull();
  });

  it('suggests pre-production once its work has started, naming it', () => {
    const s = suggest(signals({ scenes: 12, crew: 2, budget_lines: 3 }))!;
    expect(s.label).toBe('Pre-Production');
    expect(s.reasons).toEqual(['you’ve started on cast & crew, budget']);
  });

  it('suggests the next phase when this one’s milestones are all done', () => {
    const done = signals({ logline: true, scripts: 1, characters: 2, beats: 3, media: 5 });
    expect(suggest(done)).toMatchObject({ label: 'Pre-Production', reasons: ['every Development milestone is done'] });
  });

  it('jumps to production when the first shoot day arrives', () => {
    const s = signals({ status: 'pre-production', scenes: 10, shoot_start: '2026-10-01', call_sheets: 1 });
    expect(suggest(s, '2026-09-30')).toBeNull();
    expect(suggest(s, '2026-10-01')).toMatchObject({ label: 'Production', reasons: ['your first shoot day is today'] });
    expect(suggest(s, '2026-10-05')?.reasons).toEqual(['your first shoot day has passed']);
    // From development too — the evidence says where it is.
    expect(suggest({ ...s, status: 'concept' }, '2026-10-05')?.label).toBe('Production');
  });

  it('suggests post when every scene is wrapped, delivery when post is done', () => {
    expect(suggest(signals({ status: 'production', scenes: 8, scenes_wrapped: 8 }))).toMatchObject({ label: 'Post-Production', reasons: ['all 8 scenes are wrapped'] });
    expect(suggest(signals({ status: 'post-production', stages: 4, stages_done: 4 }))).toMatchObject({ label: 'Delivery', reasons: ['the post pipeline is finished'] });
  });

  it('never suggests going back', () => {
    expect(suggest(signals({ status: 'post-production', crew: 3, shoot_start: '2026-01-01' }))).toBeNull();
  });

  it('merges reasons that point at the same phase', () => {
    const s = signals({ status: 'pre-production', scenes: 5, crew: 1, castings: 1, shots: 1, budget_lines: 1, call_sheets: 1, shoot_start: '2026-09-01' });
    expect(suggest(s)?.reasons).toEqual(['your first shoot day has passed', 'every Pre-Production milestone is done']);
  });

  it('a dated call sheet alone isn’t the shoot', () => {
    expect(suggest(signals({ status: 'pre-production', call_sheets: 1, shoot_start: '2026-12-01' }))).toBeNull();
  });
});

describe('tools that arrive inside the editor and Studio', () => {
  it('breakdown and revisions open with pre-production, or early once used', () => {
    const dev = computeProgress(signals());
    expect(toolState(dev, 'breakdown')?.unlocked).toBe(false);
    expect(toolState(dev, 'revisions')?.unlocked).toBe(false);
    const started = computeProgress(signals({ breakdown_elements: 1, revisions: 1 }));
    expect(toolState(started, 'breakdown')).toMatchObject({ unlocked: true, early: true });
    expect(toolState(started, 'revisions')).toMatchObject({ unlocked: true, early: true });
    expect(toolState(computeProgress(signals({ status: 'pre-production' })), 'breakdown')?.unlocked).toBe(true);
  });

  it('reads the new signals from the RPC', () => {
    const s = toSignals({ status: 'concept', shoot_start: '2026-10-01', shoot_end: null, breakdown_elements: '4', revisions: 2 })!;
    expect(s).toMatchObject({ shoot_start: '2026-10-01', shoot_end: null, breakdown_elements: 4, revisions: 2 });
  });
});
