import { describe, it, expect } from 'vitest';
import { EMPTY_SIGNALS, type ProjectSignals } from '@/lib/os/progress';
import { computeGuide, describeWeeks, paceHours, type GuideInput } from './engine';
import { depthOf, toGuideProfile, type GuideProfile } from './profile';
import { STEPS, departmentOf } from './steps';
import { WORKFLOWS, WORKFLOW_BY_ID, pickWorkflow } from './workflows';

const sig = (o: Partial<ProjectSignals> = {}): ProjectSignals => ({ ...EMPTY_SIGNALS, status: 'concept', ...o });
const me = (o: Partial<GuideProfile> = {}): GuideProfile => ({ hours: 8, experience: 'some', team: 'small', ...o });
const guide = (o: Partial<GuideInput> & { wf?: string } = {}) =>
  computeGuide({ workflow: WORKFLOW_BY_ID[o.wf ?? 'short'], profile: me(), signals: sig(), ticked: [], ...o });
const ids = (v: ReturnType<typeof computeGuide>) => v.phases.flatMap((p) => p.steps.map((s) => s.id));
const step = (v: ReturnType<typeof computeGuide>, id: string) => v.phases.flatMap((p) => p.steps).find((s) => s.id === id)!;

describe('the library', () => {
  it('every workflow names only steps that exist', () => {
    for (const w of WORKFLOWS) for (const id of w.steps) expect(STEPS[id], `${w.id} → ${id}`).toBeDefined();
    for (const w of WORKFLOWS) for (const id of Object.keys(w.overrides ?? {})) expect(w.steps, `${w.id} overrides ${id}`).toContain(id);
  });
});

describe('picking a guide', () => {
  it('follows the format, the experience and who you are on the project', () => {
    expect(pickWorkflow('Short Film', 'first', true).id).toBe('short-first');
    expect(pickWorkflow('Short Film', 'seasoned', true).id).toBe('short');
    expect(pickWorkflow('Feature', 'first', true).id).toBe('feature');
    expect(pickWorkflow('Web Series', 'some', true).id).toBe('series');
    expect(pickWorkflow('Music Video', 'some', true).id).toBe('music-video');
    expect(pickWorkflow('Documentary', 'some', true).id).toBe('documentary');
    expect(pickWorkflow('Podcast', 'some', true).id).toBe('podcast');
    expect(pickWorkflow('Commercial', 'some', true).id).toBe('commercial');
    expect(pickWorkflow(null, 'first', true).id).toBe('short-first');
    expect(pickWorkflow('Feature', 'seasoned', false).id).toBe('on-the-crew');
  });
});

describe('depth', () => {
  it('follows experience unless chosen', () => {
    expect(depthOf({ experience: 'first' })).toBe('walkthrough');
    expect(depthOf({ experience: 'some' })).toBe('tips');
    expect(depthOf({ experience: 'seasoned' })).toBe('light');
    expect(depthOf({ experience: 'seasoned', depth: 'walkthrough' })).toBe('walkthrough');
  });

  it('a walkthrough explains every step and adds the basics; a checklist is one line each', () => {
    const walk = guide({ wf: 'short-first', profile: me({ experience: 'first' }) });
    const list = guide({ wf: 'short-first', profile: me({ experience: 'seasoned' }) });
    expect(ids(walk)).toContain('learn-format');
    expect(ids(list)).not.toContain('learn-format');
    expect(step(walk, 'logline').text.how?.length).toBeGreaterThan(0);
    expect(step(walk, 'logline').text.why).toBeTruthy();
    expect(step(list, 'logline').text).toEqual({ do: STEPS.logline.text.do });
    const tips = guide({ profile: me({ depth: 'tips' }) });
    expect(Object.keys(step(tips, 'logline').text).sort()).toEqual(['do', 'tip']);
  });
});

describe('what applies', () => {
  it('a solo filmmaker has no crew to bring in or table read to hold', () => {
    const solo = ids(guide({ profile: me({ team: 'solo' }) }));
    expect(solo).not.toContain('crew');
    expect(solo).not.toContain('table-read');
    expect(ids(guide())).toContain('crew');
  });

  it('only a real crew locks a shooting script', () => {
    expect(ids(guide({ profile: me({ team: 'crew' }) }))).toContain('revisions');
    expect(ids(guide())).not.toContain('revisions');
  });

  it('steps for milestones the format skips drop out', () => {
    const podcastRules = { phase_labels: {}, skip_phases: ['pre-production' as const], skip_milestones: ['casting', 'shots', 'festival'] };
    const v = guide({ wf: 'podcast', signals: sig({ format: podcastRules }) });
    expect(ids(v)).not.toContain('casting');
    // Pre-production steps fold into development when the format skips it.
    expect(step(v, 'test-record').phase).toBe('development');
  });

  it('crew see the steps for their department', () => {
    const actor = ids(guide({ wf: 'on-the-crew', dept: departmentOf('Actor') }));
    const dp = ids(guide({ wf: 'on-the-crew', dept: departmentOf('Director of photography') }));
    expect(actor).toContain('crew-lines');
    expect(actor).not.toContain('crew-shots');
    expect(dp).toContain('crew-shots');
    expect(dp).not.toContain('crew-lines');
    expect(actor).toContain('crew-call');
  });

  it('knows departments from crafts', () => {
    expect(departmentOf('Actor')).toBe('performer');
    expect(departmentOf('Boom operator')).toBe('sound');
    expect(departmentOf('Gaffer')).toBe('camera');
    expect(departmentOf('Costume designer')).toBe('art');
    expect(departmentOf('Story editor')).toBe('writing');
    expect(departmentOf('Editor')).toBe('post');
    expect(departmentOf('First assistant director')).toBe('direction');
    expect(departmentOf('Line producer')).toBe('production');
    expect(departmentOf(null)).toBe('other');
  });
});

describe('progress', () => {
  it('milestone steps tick themselves; the rest are ticked by hand', () => {
    const v = guide({ signals: sig({ logline: true, media: 2 }), ticked: ['draft', 'logline'] });
    expect(step(v, 'logline')).toMatchObject({ done: true, auto: true });
    expect(step(v, 'references')).toMatchObject({ done: false, auto: true, progress: { value: 2, of: 5 } });
    expect(step(v, 'draft')).toMatchObject({ done: true, auto: false });
    expect(step(v, 'brief').done).toBe(false);
  });

  it('the outline speaks the brief’s structure', () => {
    const v = guide({ structure: 'save_the_cat' });
    expect(step(v, 'beats').title).toBe('Outline the Save the Cat beats');
    expect(step(guide({ structure: 'save_the_cat', profile: me({ depth: 'walkthrough' }) }), 'beats').text.how).toContain('Midpoint: a false victory or false defeat.');
    expect(step(guide({ structure: 'freeform' }), 'beats').title).toBe('Outline the story');
  });

  it('next is the current phase first, then anything left behind', () => {
    const v = guide({ signals: sig({ status: 'pre-production' }) });
    expect(v.next?.phase).toBe('pre-production');
    const wrapped = guide({ signals: sig({ status: 'pre-production', logline: true }), ticked: [] });
    expect(wrapped.next?.id).toBe('crew');
    // With pre-production all done, what development left behind comes next.
    const pre = WORKFLOW_BY_ID.short.steps.filter((id) => STEPS[id].phase === 'pre-production');
    const done = guide({ signals: sig({ status: 'pre-production', crew: 1, castings: 1, shots: 1, budget_lines: 1, call_sheets: 1, breakdown_elements: 1 }), ticked: pre });
    expect(done.next?.phase).toBe('development');
  });
});

describe('pace', () => {
  it('scales effort by team and experience', () => {
    expect(paceHours(10, { team: 'small', experience: 'some' })).toBe(10);
    expect(paceHours(10, { team: 'solo', experience: 'first' })).toBe(17);
    expect(paceHours(10, { team: 'crew', experience: 'seasoned' })).toBe(6.5);
  });

  it('fits this week to the hours available and counts the weeks left', () => {
    const few = guide({ profile: me({ hours: 3 }) });
    const many = guide({ profile: me({ hours: 30 }) });
    expect(few.thisWeek.length).toBeGreaterThanOrEqual(1);
    expect(many.thisWeek.length).toBeGreaterThan(few.thisWeek.length);
    expect(few.thisWeek.slice(1).reduce((n, s) => n + s.hours, few.thisWeek[0].hours)).toBeLessThanOrEqual(Math.max(3, few.thisWeek[0].hours));
    expect(few.weeksLeft).toBe(Math.ceil(few.hoursLeft / 3));
    expect(many.weeksLeft).toBeLessThan(few.weeksLeft);
  });

  it('a big step still makes this week on its own', () => {
    const v = guide({ wf: 'feature', signals: sig({ logline: true, media: 5, beats: 3, characters: 1, scripts: 1 }), ticked: ['brief'], profile: me({ hours: 2 }) });
    expect(v.thisWeek.map((s) => s.id)).toEqual(['draft']);
  });

  it('a partly done milestone has less left', () => {
    expect(step(guide({ signals: sig({ media: 4 }) }), 'references').hours).toBeLessThan(step(guide(), 'references').hours);
  });

  it('a finished guide has nothing left', () => {
    const v = guide({ wf: 'on-the-crew', dept: 'performer', ticked: WORKFLOW_BY_ID['on-the-crew'].steps });
    expect(v).toMatchObject({ next: null, thisWeek: [], hoursLeft: 0, weeksLeft: 0 });
    expect(v.totals.done).toBe(v.totals.total);
  });

  it('describes the time left', () => {
    expect(describeWeeks(0)).toBe('done');
    expect(describeWeeks(1)).toBe('about a week');
    expect(describeWeeks(6)).toBe('about 6 weeks');
    expect(describeWeeks(26)).toBe('about 6 months');
  });
});

describe('reading the saved answers', () => {
  it('is tolerant', () => {
    expect(toGuideProfile(null)).toBeNull();
    expect(toGuideProfile({ hours: 5 })).toBeNull();
    expect(toGuideProfile({ experience: 'first' })).toEqual({ hours: 8, experience: 'first', team: 'small' });
    expect(toGuideProfile({ experience: 'seasoned', hours: 40, team: 'crew', depth: 'tips' })).toEqual({ hours: 40, experience: 'seasoned', team: 'crew', depth: 'tips' });
    expect(toGuideProfile({ experience: 'some', hours: 500, team: 'army', depth: 'deep' })).toEqual({ hours: 8, experience: 'some', team: 'small' });
  });
});
