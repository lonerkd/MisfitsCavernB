import { describe, it, expect } from 'vitest';
import { PHASES, type FormatRules } from './phases';
import {
  computeProgress, toolsOpenedAt, toolState, toSignals, placeHref, EMPTY_SIGNALS, MILESTONES, TOOLS,
  type ProjectProgress, type ProjectSignals, type ToolId,
} from './progress';

const signals = (patch: Partial<ProjectSignals> = {}): ProjectSignals => ({ ...EMPTY_SIGNALS, status: 'concept', project_type: 'Short Film', ...patch });

// Rules as public.project_formats holds them (seeded in 20260927030000).
const PODCAST: FormatRules = {
  phase_labels: {
    development: { label: 'Planning', abbr: 'PLAN' }, production: { label: 'Recording', abbr: 'REC' },
    'post-production': { label: 'Editing', abbr: 'EDIT' }, delivery: { label: 'Published', abbr: 'OUT' },
  },
  skip_phases: ['pre-production'],
  skip_milestones: ['characters', 'casting', 'shots', 'schedule', 'wrap-first', 'wrap-all', 'festival'],
};
const MUSIC_VIDEO: FormatRules = {
  phase_labels: { production: { label: 'Shoot', abbr: 'SHOOT' }, 'post-production': { label: 'Edit', abbr: 'EDIT' }, delivery: { label: 'Released', abbr: 'OUT' } },
  skip_phases: ['pre-production'],
  skip_milestones: [],
};

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

  it('follows the project’s format: skipped phases fold into the one before, irrelevant milestones drop', () => {
    const podcast = computeProgress(signals({ project_type: 'Podcast', format: PODCAST }));
    expect(podcast.phases.map((ph) => ph.label)).toEqual(['Planning', 'Recording', 'Editing', 'Published']);
    const ids = podcast.phases.flatMap((ph) => ph.milestones.map((m) => m.id));
    expect(ids).not.toContain('shots');
    expect(ids).not.toContain('festival');
    // Pre-production is skipped, so its tools are there from the start.
    expect(toolState(podcast, 'budget')?.unlocked).toBe(true);
    expect(podcast.phases[0].milestones.map((m) => m.id)).toContain('crew');

    const mv = computeProgress(signals({ project_type: 'Music Video', format: MUSIC_VIDEO, status: 'production' }));
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
    expect(s.format).toBeNull();
  });

  it('reads the format’s rules and drops anything malformed', () => {
    const s = toSignals({
      format: {
        phase_labels: { production: { label: 'Shoot', abbr: 'SHOOT' }, 'post-production': { label: 'Edit' }, nonsense: { label: 'x' }, delivery: 3 },
        skip_phases: ['pre-production', 'development', 'delivery', 'bogus'],
        skip_milestones: ['shots', 4],
      },
    })!;
    expect(s.format).toEqual({
      phase_labels: { production: { label: 'Shoot', abbr: 'SHOOT' }, 'post-production': { label: 'Edit', abbr: 'EDIT' } },
      skip_phases: ['pre-production'],
      skip_milestones: ['shots'],
      approval_gates: [],
    });
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

// ── Edge cases ───────────────────────────────────────────────────
// Expected counts are derived from MILESTONES / TOOLS (never a literal total),
// so adding a milestone doesn't break these; they pin the engine's behaviour.

const allMilestoneIds = MILESTONES.map((m) => m.id);
const idsOf = (p: ProjectProgress) => p.phases.flatMap((ph) => ph.milestones.map((m) => m.id));
const milestone = (p: ProjectProgress, id: string) => p.phases.flatMap((ph) => ph.milestones).find((m) => m.id === id);

describe('computeProgress edge cases', () => {
  describe('empty signals', () => {
    const p = computeProgress(EMPTY_SIGNALS);

    it('sits in development with all five phases and nothing done', () => {
      expect(p.currentIndex).toBe(0);
      expect(p.current.id).toBe('development');
      expect(p.next?.id).toBe('pre-production');
      expect(p.phases.map((ph) => ph.id)).toEqual(PHASES.map((ph) => ph.id));
      expect(p.phases.map((ph) => ph.index)).toEqual([0, 1, 2, 3, 4]);
      expect(p.ready).toBe(false);
      expect(p.totals).toEqual({ done: 0, total: MILESTONES.length });
      expect(idsOf(p)).toEqual(allMilestoneIds);
      expect(p.phases.every((ph) => ph.done === 0 && ph.total === ph.milestones.length)).toBe(true);
    });

    it('reports no done milestone, and no progress except zero-of-a-target counts', () => {
      expect(p.phases.flatMap((ph) => ph.milestones).every((m) => !m.done)).toBe(true);
      expect(milestone(p, 'beats')!.progress).toEqual({ value: 0, of: 3 });
      expect(milestone(p, 'references')!.progress).toEqual({ value: 0, of: 5 });
      for (const id of ['wrap-all', 'tasks', 'notes-resolved', 'pipeline', 'deliverables']) {
        expect(milestone(p, id)!.progress).toBeNull();
      }
    });

    it('opens exactly the development tools and flags none as early', () => {
      const dev = TOOLS.filter((t) => t.phase === 'development').map((t) => t.id);
      expect(p.tools.filter((t) => t.unlocked).map((t) => t.id)).toEqual(dev);
      expect(p.tools.some((t) => t.early)).toBe(false);
    });

    it('next steps are the first three milestones in order', () => {
      expect(p.nextSteps.map((m) => m.id)).toEqual(allMilestoneIds.slice(0, 3));
    });

    it('an unknown status reads as development', () => {
      expect(computeProgress(signals({ status: 'nonsense' })).current.id).toBe('development');
    });
  });

  describe('partial milestone completion', () => {
    it('beats count up to three and clamp there', () => {
      expect(milestone(computeProgress(signals({ beats: 2 })), 'beats')).toMatchObject({ done: false, progress: { value: 2, of: 3 } });
      expect(milestone(computeProgress(signals({ beats: 3 })), 'beats')).toMatchObject({ done: true, progress: { value: 3, of: 3 } });
      expect(milestone(computeProgress(signals({ beats: 40 })), 'beats')).toMatchObject({ done: true, progress: { value: 3, of: 3 } });
    });

    it('references clamp at five', () => {
      expect(milestone(computeProgress(signals({ media: 4 })), 'references')).toMatchObject({ done: false, progress: { value: 4, of: 5 } });
      expect(milestone(computeProgress(signals({ media: 99 })), 'references')).toMatchObject({ done: true, progress: { value: 5, of: 5 } });
    });

    it('wrapped scenes, tasks and notes show a fraction until the last one is done', () => {
      const p = computeProgress(signals({
        status: 'production', scenes: 4, scenes_wrapped: 1, tasks: 3, tasks_done: 2, post_notes: 5, post_notes_open: 2,
      }));
      expect(milestone(p, 'wrap-first')!.done).toBe(true);
      expect(milestone(p, 'wrap-all')).toMatchObject({ done: false, progress: { value: 1, of: 4 } });
      expect(milestone(p, 'tasks')).toMatchObject({ done: false, progress: { value: 2, of: 3 } });
      expect(milestone(p, 'notes')!.done).toBe(true);
      expect(milestone(p, 'notes-resolved')).toMatchObject({ done: false, progress: { value: 3, of: 5 } });
      expect(p.ready).toBe(false);
    });

    it('a milestone is done at the target, not before', () => {
      const p = computeProgress(signals({ status: 'production', scenes: 3, scenes_wrapped: 3, tasks: 2, tasks_done: 2 }));
      expect(milestone(p, 'wrap-all')).toMatchObject({ done: true, progress: { value: 3, of: 3 } });
      expect(milestone(p, 'tasks')!.done).toBe(true);
    });

    it('per-phase and total counts add up to the done milestones', () => {
      const p = computeProgress(signals({ logline: true, scripts: 1, crew: 2, budget_lines: 1, visibility: 'public' }));
      const done = p.phases.flatMap((ph) => ph.milestones).filter((m) => m.done).map((m) => m.id);
      expect([...done].sort()).toEqual(['budget', 'crew', 'logline', 'script', 'share']);
      expect(p.totals.done).toBe(done.length);
      expect(p.phases.map((ph) => ph.done)).toEqual([2, 2, 0, 0, 1]);
      expect(p.ready).toBe(false);
    });

    it('a finished phase is ready and leaves no next steps behind', () => {
      const p = computeProgress(signals({ logline: true, scripts: 1, characters: 1, beats: 3, media: 5 }));
      expect(p.ready).toBe(true);
      expect(p.nextSteps).toEqual([]);
    });

    it('next steps are capped at three', () => {
      expect(computeProgress(signals({ status: 'delivery' })).nextSteps).toHaveLength(3);
    });
  });

  describe('signals that run ahead of the status', () => {
    const ahead = computeProgress(signals({ status: 'concept', scenes_wrapped: 1, scenes: 3, cuts: 2, call_sheets: 1, shots: 1 }));

    it('the status decides the current phase, whatever the data says', () => {
      expect(ahead.current.id).toBe('development');
      expect(ahead.ready).toBe(false);
    });

    it('later-phase milestones still read their data', () => {
      expect(milestone(ahead, 'wrap-first')!.done).toBe(true);
      expect(milestone(ahead, 'cut')!.done).toBe(true);
      expect(milestone(ahead, 'shots')!.done).toBe(true);
      expect(milestone(ahead, 'wrap-all')!.progress).toEqual({ value: 1, of: 3 });
    });

    it('later tools open early only where their own work has started', () => {
      expect(toolState(ahead, 'schedule')).toMatchObject({ unlocked: true, early: true });
      expect(toolState(ahead, 'onset')).toMatchObject({ unlocked: true, early: true });
      expect(toolState(ahead, 'post')).toMatchObject({ unlocked: true, early: true });
      expect(toolState(ahead, 'budget')).toMatchObject({ unlocked: false, early: false });
      expect(toolState(ahead, 'festivals')).toMatchObject({ unlocked: false, early: false });
    });

    it('toolsOpenedAt leaves out tools that opened early', () => {
      expect(toolsOpenedAt(ahead, 1).map((t) => t.id)).not.toContain('schedule');
      expect(toolsOpenedAt(ahead, 1).map((t) => t.id)).toContain('budget');
      expect(toolsOpenedAt(ahead, 3)).toEqual([]);
    });

    it('left-behind work follows the current phase once the status moves on', () => {
      const p = computeProgress(signals({ status: 'post-production', logline: true, scripts: 1 }));
      expect(p.current.id).toBe('post-production');
      expect(p.nextSteps.map((m) => m.id)).toEqual(['cut', 'notes', 'notes-resolved']);
    });
  });

  describe('format rules: skipped phases and milestones', () => {
    it('drops skipped milestones and the total equals what is left', () => {
      const p = computeProgress(signals({ format: PODCAST }));
      const kept = allMilestoneIds.filter((id) => !PODCAST.skip_milestones.includes(id));
      expect([...idsOf(p)].sort()).toEqual([...kept].sort());
      expect(p.totals.total).toBe(kept.length);
    });

    it('a skipped milestone never counts, even when its data is present', () => {
      const p = computeProgress(signals({ format: PODCAST, shots: 5, castings: 2, festivals_submitted: 1 }));
      expect(p.totals.done).toBe(0);
      expect(milestone(p, 'shots')).toBeUndefined();
    });

    it('a skipped phase folds its milestones into the phase before it', () => {
      const p = computeProgress(signals({ format: PODCAST }));
      const expected = MILESTONES
        .filter((m) => (m.phase === 'development' || m.phase === 'pre-production') && !PODCAST.skip_milestones.includes(m.id))
        .map((m) => m.id);
      expect(p.phases[0].milestones.map((m) => m.id)).toEqual(expected);
      expect(p.phases.map((ph) => ph.id)).toEqual(['development', 'production', 'post-production', 'delivery']);
    });

    it('a status in a skipped phase lands on the phase it folded into', () => {
      const p = computeProgress(signals({ format: PODCAST, status: 'pre-production' }));
      expect(p.currentIndex).toBe(0);
      expect(p.current.id).toBe('development');
      expect(p.next?.id).toBe('production');
    });

    it('tools of a skipped phase open with the phase before it', () => {
      const p = computeProgress(signals({ format: PODCAST }));
      for (const t of TOOLS.filter((t) => t.phase === 'pre-production')) {
        expect(toolState(p, t.id)).toMatchObject({ unlocked: true, early: false, phaseIndex: 0, phaseLabel: 'Planning' });
      }
      expect(toolState(p, 'onset')).toMatchObject({ unlocked: false, phaseIndex: 1, phaseLabel: 'Recording' });
    });

    it('no early flag when the phase is already reached', () => {
      const p = computeProgress(signals({ format: PODCAST, status: 'post-production', cuts: 1 }));
      expect(toolState(p, 'post')).toMatchObject({ unlocked: true, early: false });
    });

    it('early opening still works in a folded format', () => {
      const p = computeProgress(signals({ format: PODCAST, cuts: 1 }));
      expect(toolState(p, 'post')).toMatchObject({ unlocked: true, early: true, phaseLabel: 'Editing' });
    });

    it('renamed phases carry through to phases, current and tools', () => {
      const p = computeProgress(signals({ format: MUSIC_VIDEO, status: 'production' }));
      expect(p.phases.map((ph) => ph.abbr)).toEqual(['DEV', 'SHOOT', 'EDIT', 'OUT']);
      expect(p.current).toBe(p.phases[p.currentIndex]);
      expect(toolState(p, 'post')).toMatchObject({ unlocked: false, phaseLabel: 'Edit' });
    });

    it('a format that changes nothing matches no format at all', () => {
      const none: FormatRules = { phase_labels: {}, skip_phases: [], skip_milestones: [] };
      expect(computeProgress(signals({ format: none })).phases).toEqual(computeProgress(signals()).phases);
    });
  });

  describe('unlock all', () => {
    it('opens every tool from empty signals, with nothing flagged early', () => {
      const p = computeProgress(EMPTY_SIGNALS, { unlockAll: true });
      expect(p.tools).toHaveLength(TOOLS.length);
      expect(p.tools.every((t) => t.unlocked && !t.early)).toBe(true);
    });

    it('does not change milestones, totals or the current phase', () => {
      const base = computeProgress(signals({ logline: true }));
      const open = computeProgress(signals({ logline: true }), { unlockAll: true });
      expect({ ...open, tools: null }).toEqual({ ...base, tools: null });
    });

    it('the option wins over the project flag when given', () => {
      expect(computeProgress(signals({ unlock_all: true }), { unlockAll: false }).tools.some((t) => !t.unlocked)).toBe(true);
      expect(computeProgress(signals({ unlock_all: false }), { unlockAll: true }).tools.every((t) => t.unlocked)).toBe(true);
    });

    it('keeps the early flag honest: a tool with work started stays flagged early', () => {
      const p = computeProgress(signals({ cuts: 1 }), { unlockAll: true });
      expect(toolState(p, 'post')).toMatchObject({ unlocked: true, early: true });
      expect(toolState(p, 'portfolio')).toMatchObject({ unlocked: true, early: false });
    });

    it('works with a folded format too', () => {
      expect(computeProgress(signals({ format: PODCAST }), { unlockAll: true }).tools.every((t) => t.unlocked)).toBe(true);
    });
  });
});

// A type-level guard that the tool ids used above are real.
const _ids: ToolId[] = ['post', 'portfolio'];
void _ids;
