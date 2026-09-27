import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject, createScript } from './support/project';
import { createStudioApi } from '@/lib/studio/api';
import { createBreakdownApi } from '@/lib/breakdown/api';
import { parseScript } from '@/lib/scriptos/parser';

// The breakdown remembers what you tagged in your other projects — and only
// yours: breakdown_memory() runs with the caller's rights, so it can never
// reach a project the caller isn't on.
let cast: Cast;
const projects: string[] = [];

async function projectWith(title: string, tags: Array<[string, string]>) {
  const { projectId } = await createCrewedProject(cast, title);
  const text = 'INT. CAVE - NIGHT\n\nSomething happens.\n';
  const scriptId = await createScript(cast, projectId, text);
  const [scene] = await createStudioApi(cast.sam.client).syncScriptScenes(scriptId, parseScript(text).scenes);
  const sam = createBreakdownApi(cast.sam.client);
  const cats = await sam.listCategories(projectId);
  for (const [name, key] of tags) await sam.tag(scene.id, name, cats.find((c) => c.key === key)!.id);
  projects.push(projectId);
  return projectId;
}

beforeAll(async () => {
  cast = await createCast();
  await projectWith('Memory one', [['Brass lantern', 'props'], ['Sparks', 'sound']]);
  await projectWith('Memory two', [['Sparks', 'sound'], ['Trench coat', 'wardrobe']]);
  await projectWith('Memory three', [['sparks', 'vfx']]);
});

afterAll(async () => {
  await destroyCast(cast);
});

describe('breakdown memory', () => {
  it('returns each thing once, filed where it was filed most often', async () => {
    const rows = await createBreakdownApi(cast.sam.client).memory(null);
    const byName = Object.fromEntries(rows.map((r) => [r.name.toLowerCase(), r]));
    expect(byName['brass lantern']).toMatchObject({ category_key: 'props', projects: 1 });
    expect(byName['sparks']).toMatchObject({ category_key: 'sound', projects: 2 });
    expect(rows.filter((r) => r.name.toLowerCase() === 'sparks')).toHaveLength(1);
  });

  it('leaves out the project being worked on', async () => {
    const rows = await createBreakdownApi(cast.sam.client).memory(projects[0]);
    expect(rows.map((r) => r.name)).not.toContain('Brass lantern');
    expect(rows.map((r) => r.name)).toContain('Trench coat');
  });

  it('crew remember what they worked on; outsiders get nothing', async () => {
    expect((await createBreakdownApi(cast.jordan.client).memory(null)).map((r) => r.name)).toContain('Trench coat');
    expect(await createBreakdownApi(cast.riley.client).memory(null)).toEqual([]);
  });

  it('signed-out callers cannot call it', async () => {
    const { error } = await anonClient().rpc('breakdown_memory', {});
    expect(error).not.toBeNull();
  });

  it('scenes no longer store the parser’s guesses', async () => {
    const { error } = await cast.sam.client.from('scenes').select('elements').limit(1);
    expect(error).not.toBeNull();
  });
});
