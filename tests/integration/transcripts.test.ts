import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, adminClient, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// Transcripts on library media and the paper edit built from them, as each
// persona: the owner and crew transcribe and pick selects; outsiders see
// nothing; crew remove only their own lines; set_paper_edit is all or nothing.
let cast: Cast;
let projectId: string;
let otherProjectId: string;
let interview: string;
let broll: string;
let otherMedia: string;

async function addMedia(pid: string, title: string, by: Cast['sam']) {
  const { data, error } = await by.client.from('media')
    .insert({ project_id: pid, kind: 'video', title, external_url: 'https://example.com/v.mp4', created_by: by.id })
    .select('id').single();
  if (error) throw error;
  return data.id as string;
}

const line = (media: string, position: number, text: string, extra: Record<string, unknown> = {}) =>
  ({ project_id: projectId, media_id: media, position, text, ...extra });

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Transcripts'));
  interview = await addMedia(projectId, 'Ana interview', cast.sam);
  broll = await addMedia(projectId, 'Docks', cast.jordan);
  otherProjectId = (await adminClient().from('projects').insert({ title: 'Elsewhere', creator_id: cast.sam.id, status: 'post-production' }).select('id').single()).data!.id;
  otherMedia = await addMedia(otherProjectId, 'Other', cast.sam);
});

afterAll(async () => {
  await adminClient().from('projects').delete().eq('id', otherProjectId);
  await destroyCast(cast);
});

describe('transcript lines', () => {
  it('the owner and crew add lines and read each other’s', async () => {
    const a = await cast.sam.client.from('transcript_lines').insert([
      line(interview, 0, 'When did you start?', { start_ms: 5000, end_ms: 9000, speaker: 'Interviewer' }),
      line(interview, 1, 'In 1998, on the docks.', { start_ms: 9000, end_ms: 20000, speaker: 'Ana' }),
    ]).select('id');
    expect(a.error).toBeNull();
    const b = await cast.jordan.client.from('transcript_lines').insert(line(broll, 0, 'Gulls over the cranes.', { start_ms: 60000, end_ms: 64000 })).select('id');
    expect(b.error).toBeNull();
    for (const who of [cast.sam, cast.jordan]) {
      const { data } = await who.client.from('transcript_lines').select('text').eq('project_id', projectId).order('text');
      expect(data?.map((r) => r.text)).toEqual(['Gulls over the cranes.', 'In 1998, on the docks.', 'When did you start?']);
    }
  });

  it('outsiders and strangers see nothing and add nothing', async () => {
    expect((await cast.riley.client.from('transcript_lines').select('id').eq('project_id', projectId)).data).toEqual([]);
    expect((await anonClient().from('transcript_lines').select('id').eq('project_id', projectId)).data ?? []).toEqual([]);
    expect((await cast.riley.client.from('transcript_lines').insert(line(interview, 5, 'sneak')).select('id')).error).not.toBeNull();
  });

  it('refuses nonsense: bad times, empty text, another project’s recording, moving a line', async () => {
    const bad = [
      line(interview, 2, 'x', { start_ms: 5000, end_ms: 1000 }),
      line(interview, 2, 'x', { end_ms: 1000 }),
      line(interview, 2, '   '),
      line(interview, 2, 'x', { speaker: '' }),
      { project_id: projectId, media_id: otherMedia, position: 0, text: 'wrong project' },
    ];
    for (const row of bad) expect((await cast.sam.client.from('transcript_lines').insert(row).select('id')).error, JSON.stringify(row)).not.toBeNull();
    const { data } = await cast.sam.client.from('transcript_lines').select('id').eq('media_id', interview).limit(1).single();
    expect((await cast.sam.client.from('transcript_lines').update({ media_id: broll }).eq('id', data!.id).select('id')).error).not.toBeNull();
  });

  it('crew remove their own lines; the owner removes any', async () => {
    const { data: samLine } = await cast.sam.client.from('transcript_lines').insert(line(interview, 9, 'Owner aside.')).select('id').single();
    const { data: jordanLine } = await cast.jordan.client.from('transcript_lines').insert(line(broll, 9, 'Crew aside.')).select('id').single();
    await cast.jordan.client.from('transcript_lines').delete().eq('id', samLine!.id);
    expect((await cast.sam.client.from('transcript_lines').select('id').eq('id', samLine!.id)).data).toHaveLength(1);
    await cast.jordan.client.from('transcript_lines').delete().eq('id', jordanLine!.id);
    await cast.sam.client.from('transcript_lines').delete().eq('id', samLine!.id);
    expect((await cast.sam.client.from('transcript_lines').select('id').in('id', [samLine!.id, jordanLine!.id])).data).toEqual([]);
  });

  it('go when their recording is deleted', async () => {
    const temp = await addMedia(projectId, 'Temp', cast.sam);
    await cast.sam.client.from('transcript_lines').insert(line(temp, 0, 'Gone soon.'));
    await cast.sam.client.from('media').delete().eq('id', temp);
    expect((await adminClient().from('transcript_lines').select('id').eq('media_id', temp)).data).toEqual([]);
  });
});

describe('the paper edit', () => {
  const ids = async () => {
    const { data } = await cast.sam.client.from('transcript_lines').select('id, text').eq('project_id', projectId);
    return Object.fromEntries((data ?? []).map((r) => [r.text, r.id])) as Record<string, string>;
  };
  const order = async () => {
    const { data } = await cast.jordan.client.from('transcript_lines').select('text, paper_order').eq('project_id', projectId).not('paper_order', 'is', null).order('paper_order');
    return data?.map((r) => r.text);
  };

  it('crew set the selects in order, across recordings, and can reorder them', async () => {
    const t = await ids();
    expect((await cast.jordan.client.rpc('set_paper_edit', { p_project: projectId, p_line_ids: [t['Gulls over the cranes.'], t['In 1998, on the docks.']] })).error).toBeNull();
    expect(await order()).toEqual(['Gulls over the cranes.', 'In 1998, on the docks.']);
    expect((await cast.sam.client.rpc('set_paper_edit', { p_project: projectId, p_line_ids: [t['In 1998, on the docks.'], t['When did you start?'], t['Gulls over the cranes.']] })).error).toBeNull();
    expect(await order()).toEqual(['In 1998, on the docks.', 'When did you start?', 'Gulls over the cranes.']);
    expect((await cast.sam.client.rpc('set_paper_edit', { p_project: projectId, p_line_ids: [t['When did you start?']] })).error).toBeNull();
    expect(await order()).toEqual(['When did you start?']);
  });

  it('is all or nothing: repeats, unknown lines and outsiders change nothing', async () => {
    const t = await ids();
    const { data: other } = await cast.sam.client.from('transcript_lines')
      .insert({ project_id: otherProjectId, media_id: otherMedia, position: 0, text: 'Elsewhere.' }).select('id').single();
    for (const bad of [
      [t['In 1998, on the docks.'], t['In 1998, on the docks.']],
      [t['In 1998, on the docks.'], other!.id],
      [t['In 1998, on the docks.'], '00000000-0000-0000-0000-000000000000'],
    ]) {
      expect((await cast.sam.client.rpc('set_paper_edit', { p_project: projectId, p_line_ids: bad })).error, bad.join()).not.toBeNull();
    }
    expect((await cast.riley.client.rpc('set_paper_edit', { p_project: projectId, p_line_ids: [] })).error).toBeNull();
    expect((await cast.riley.client.rpc('set_paper_edit', { p_project: projectId, p_line_ids: [t['Gulls over the cranes.']] })).error).not.toBeNull();
    expect(await order()).toEqual(['When did you start?']);
  });
});
