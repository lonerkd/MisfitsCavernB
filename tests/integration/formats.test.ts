import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';
import { toSignals, computeProgress } from '@/lib/os/progress';

// Project formats are data: everyone reads the list, admins extend it, a
// project's format must be on it, and the phase engine reads the format's
// rules from project_progress() — no format is named in the app's code.
let cast: Cast;
let projectId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Formats'));
});

afterAll(async () => {
  await destroyCast(cast);
  await adminClient().from('project_formats').delete().in('name', ['Stage Show', 'Live Show']);
});

describe('the list', () => {
  it('everyone can read it, signed in or not', async () => {
    const { data, error } = await anonClient().from('project_formats').select('name, script_format').order('position');
    expect(error).toBeNull();
    expect(data!.map((f) => f.name)).toEqual(expect.arrayContaining(['Feature', 'Short Film', 'Music Video', 'Documentary', 'Podcast', 'Other']));
    expect(data!.find((f) => f.name === 'Documentary')?.script_format).toBe('doc-outline');
  });

  it('only admins change it, and the rules are checked', async () => {
    expect((await cast.sam.client.from('project_formats').insert({ name: 'Stage Show' })).error).not.toBeNull();
    const admin = adminClient();
    expect((await admin.from('project_formats').insert({ name: 'Stage Show', skip_phases: ['development'] })).error).not.toBeNull();
    expect((await admin.from('project_formats').insert({ name: 'Stage Show', phase_labels: { rehearsal: { label: 'Rehearsal' } } })).error).not.toBeNull();
    expect((await admin.from('project_formats').insert({ name: 'Stage Show', script_format: 'haiku' })).error).not.toBeNull();
    expect((await admin.from('project_formats').insert({
      name: 'Stage Show', script_format: 'stage-play', position: 50,
      phase_labels: { production: { label: 'Rehearsals', abbr: 'REH' }, delivery: { label: 'Opening night', abbr: 'OPEN' } },
    })).error).toBeNull();
  });
});

describe('a project’s format', () => {
  it('starts as a Feature; must be on the list', async () => {
    expect((await cast.sam.client.from('projects').select('project_type').eq('id', projectId).single()).data?.project_type).toBe('Feature');
    expect((await cast.sam.client.from('projects').update({ project_type: 'Opera' }).eq('id', projectId)).error).not.toBeNull();
  });

  it('only the owner changes it', async () => {
    const byCrew = await cast.jordan.client.from('projects').update({ project_type: 'Podcast' }).eq('id', projectId).select('id');
    expect(byCrew.data ?? []).toEqual([]);
    expect((await cast.sam.client.from('projects').update({ project_type: 'Podcast' }).eq('id', projectId)).error).toBeNull();
  });

  it('the phase engine follows the format’s rules, for crew too', async () => {
    const { data } = await cast.jordan.client.rpc('project_progress', { p_project: projectId });
    const s = toSignals(data)!;
    expect(s.project_type).toBe('Podcast');
    const p = computeProgress(s);
    expect(p.phases.map((ph) => ph.label)).toEqual(['Planning', 'Recording', 'Editing', 'Published']);
    expect(p.phases.flatMap((ph) => ph.milestones.map((m) => m.id))).not.toContain('shots');
  });

  it('a new format works without a code change; renaming it follows through', async () => {
    await cast.sam.client.from('projects').update({ project_type: 'Stage Show' }).eq('id', projectId);
    const admin = adminClient();
    expect((await admin.from('project_formats').update({ name: 'Live Show' }).eq('name', 'Stage Show')).error).toBeNull();
    const { data } = await cast.sam.client.rpc('project_progress', { p_project: projectId });
    const s = toSignals(data)!;
    expect(s.project_type).toBe('Live Show');
    expect(computeProgress(s).phases.map((ph) => ph.label)).toEqual(['Development', 'Pre-Production', 'Rehearsals', 'Post-Production', 'Opening night']);
    // A format still in use can't be deleted out from under its projects.
    expect((await admin.from('project_formats').delete().eq('name', 'Live Show')).error).not.toBeNull();
    await cast.sam.client.from('projects').update({ project_type: 'Feature' }).eq('id', projectId);
  });

  it('a portfolio piece’s format must be on the list too', async () => {
    const ok = await cast.sam.client.from('portfolio_projects').insert({ user_id: cast.sam.id, title: 'Reel', category: 'Music Video' }).select('id').single();
    expect(ok.error).toBeNull();
    expect((await cast.sam.client.from('portfolio_projects').insert({ user_id: cast.sam.id, title: 'Reel 2', category: 'Opera' })).error).not.toBeNull();
    await cast.sam.client.from('portfolio_projects').delete().eq('id', ok.data!.id);
  });
});
