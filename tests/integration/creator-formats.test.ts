import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, createCast, destroyCast, type Cast } from './support/personas';

// The creator formats: YouTube / video script, article, game script. The format list is data in two places the database checks.
let cast: Cast;
const projects: string[] = [];

beforeAll(async () => { cast = await createCast(); });
afterAll(async () => {
  if (projects.length) await adminClient().from('projects').delete().in('id', projects);
  await destroyCast(cast);
});

const NEW = [
  { type: 'YouTube', script: 'video-script' },
  { type: 'Blog / Newsletter', script: 'prose' },
  { type: 'Video Game', script: 'game-script' },
];

describe('creator formats', () => {
  it.each(NEW)('the $type project type opens its scripts in $script', async ({ type, script }) => {
    const f = await adminClient().from('project_formats').select('script_format, skip_phases').eq('name', type).single();
    expect(f.error).toBeNull();
    expect(f.data?.script_format).toBe(script);
    const p = await cast.sam.client.from('projects').insert({ title: `${type} test`, creator_id: cast.sam.id, project_type: type }).select('id').single();
    expect(p.error).toBeNull();
    projects.push(p.data!.id);
    const s = await cast.sam.client.from('scripts').insert({ title: 'Draft', content: '', created_by: cast.sam.id, last_edited_by: cast.sam.id, project_id: p.data!.id, format: script }).select('format').single();
    expect(s.error).toBeNull();
    expect(s.data?.format).toBe(script);
  });

  it('an unknown script format is still refused, by the script and by a project type', async () => {
    const bad = await cast.sam.client.from('scripts').insert({ title: 'x', content: '', created_by: cast.sam.id, last_edited_by: cast.sam.id, format: 'not-a-format' });
    expect(bad.error).not.toBeNull();
    const fmt = await adminClient().from('project_formats').insert({ name: 'Bad format test', script_format: 'not-a-format', position: 99 });
    expect(fmt.error).not.toBeNull();
  });

  it('the project types are in order, with Other last, and the owner can use them as a plain person (no admin)', async () => {
    const all = await cast.sam.client.from('project_formats').select('name, position').order('position');
    expect(all.error).toBeNull();
    const names = (all.data ?? []).map((r) => r.name);
    expect(names.at(-1)).toBe('Other');
    for (const n of NEW) expect(names).toContain(n.type);
  });
});
