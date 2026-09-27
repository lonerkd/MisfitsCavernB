import { describe, it, expect } from 'vitest';
import { computeProgress, toolsOpenedAt, toolState, toSignals, placeHref, EMPTY_SIGNALS, type ProjectSignals } from './progress';

const signals = (patch: Partial<ProjectSignals> = {}): ProjectSignals => ({ ...EMPTY_SIGNALS, status: 'concept', project_type: 'Short Film', ...patch });

describe('computeProgress', () => {
  it('a new short film is in development with only development tools open', () => {
    const p = computeProgress(signals());
    expect(p.current.id).toBe('development');
    expect(p.next?.id).toBe('pre-production');
    expect(p.ready).toBe(false);
    const open = p.tools.filter((t) => t.unlocked).map((t) => t.id);
    expect(open).toEqual(['script', 'library', 'story', 'pitch', 'soundtrack', 'share']);
    expect(p.nextSteps.map((m) => m.id)).toEqual(['logline', 'script', 'characters']);
  });

  it('milestones read the data: done, partial, and ready to advance', () => {
    const p = computeProgress(signals({ logline: true, scripts: 1, characters: 2, beats: 1, media: 5 }));
    const dev = p.current.milestones;
    expect(dev.find((m) => m.id === 'beats')).toMatchObject({ done: false, progress: { value: 1, of: 3 } });
    expect(p.current.done).toBe(4);
    expect(p.ready).toBe(false);
    expect(computeProgress(signals({ logline: true, scripts: 1, characters: 2, beats: 3, media: 9 })).ready).toBe(true);
  });

  it('opens a tool early once its work has started', () => {
    const p = computeProgress(signals({ scenes: 4, cuts: 1 }));
    expect(toolState(p, 'scenes')).toMatchObject({ unlocked: true, early: true });
    expect(toolState(p, 'post')).toMatchObject({ unlocked: true, early: true });
    expect(toolState(p, 'schedule')).toMatchObject({ unlocked: false, phaseLabel: 'Pre-Production' });
  });

  it('reaching a phase opens its tools; earlier phases keep theirs', () => {
    const p = computeProgress(signals({ status: 'post-production' }));
    expect(p.tools.filter((t) => !t.unlocked).map((t) => t.id)).toEqual(['promos', 'festivals', 'portfolio']);
    expect(toolsOpenedAt(p, p.currentIndex).map((t) => t.id)).toEqual(['post']);
  });

  it('unlockAll opens everything', () => {
    expect(computeProgress(signals(), { unlockAll: true }).tools.every((t) => t.unlocked)).toBe(true);
  });

  it('next steps include work left behind in earlier phases', () => {
    const p = computeProgress(signals({ status: 'production', scenes: 2, scenes_wrapped: 2, tasks: 1, tasks_done: 1 }));
    expect(p.ready).toBe(true);
    expect(p.nextSteps[0].id).toBe('logline');
  });

  it('an empty count never reads as done ("every scene wrapped" of none)', () => {
    const p = computeProgress(signals({ status: 'production' }));
    expect(p.current.milestones.every((m) => !m.done)).toBe(true);
    expect(p.current.milestones.find((m) => m.id === 'wrap-all')!.progress).toBeNull();
  });

  it('follows the project type: skipped phases fold into the one before, irrelevant milestones drop', () => {
    const podcast = computeProgress(signals({ project_type: 'Podcast' }));
    expect(podcast.phases.map((ph) => ph.label)).toEqual(['Planning', 'Recording', 'Editing', 'Published']);
    const ids = podcast.phases.flatMap((ph) => ph.milestones.map((m) => m.id));
    expect(ids).not.toContain('shots');
    expect(ids).not.toContain('festival');
    // Pre-production is skipped, so its tools are there from the start.
    expect(toolState(podcast, 'budget')?.unlocked).toBe(true);
    expect(podcast.phases[0].milestones.map((m) => m.id)).toContain('crew');

    const mv = computeProgress(signals({ project_type: 'Music Video', status: 'production' }));
    expect(mv.current.label).toBe('Shoot');
  });

  it('counts totals across the project', () => {
    const p = computeProgress(signals({ logline: true, portfolio: 1 }));
    expect(p.totals.done).toBe(2);
    expect(p.totals.total).toBe(p.phases.reduce((n, ph) => n + ph.total, 0));
  });
});

describe('toSignals', () => {
  it('normalises the RPC payload and rejects nothing-to-see', () => {
    expect(toSignals(null)).toBeNull();
    const s = toSignals({ status: 'concept', scripts: '3', logline: true, media: null, extra: 1 })!;
    expect(s).toMatchObject({ status: 'concept', scripts: 3, logline: true, media: 0, visibility: null });
    expect('extra' in s).toBe(false);
  });
});

describe('placeHref', () => {
  it('links to the hub, a Studio tab/view, or a page', () => {
    expect(placeHref({ kind: 'hub', anchor: 'logline' }, 'p1')).toBe('/projects/p1#logline');
    expect(placeHref({ kind: 'studio', tab: 'production', view: 'schedule' }, 'p1')).toBe('/studio?tab=production&view=schedule');
    expect(placeHref({ kind: 'path', path: '/editor' }, 'p1')).toBe('/editor');
  });
});

describe('unlock_all', () => {
  it('the project setting opens everything', () => {
    expect(computeProgress(signals({ unlock_all: true })).tools.every((t) => t.unlocked)).toBe(true);
  });
});
