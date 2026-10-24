import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, anonClient, createCast, createPersona, destroyCast, type Cast, type Persona } from './support/personas';
import { createCrewedProject, createScript } from './support/project';
import { searchSuite } from '@/lib/search/search';

// Suite-wide search as personas: Sam's production (Jordan on its crew) holds
// a script, a location and a task; Riley has a public project of their own.
// Search finds your own work by word starts, across kinds; crew find what the
// production shares with them; outsiders find none of it; sample people stay
// out of the people results.
let cast: Cast;
let nova: Persona;
let projectId: string;
let rileyProject: string;
const TAG = `q${Date.now().toString(36)}`;

beforeAll(async () => {
  cast = await createCast();
  nova = await createPersona('nova');
  ({ projectId } = await createCrewedProject(cast, `Lighthouse ${TAG}`));
  await createScript(cast, projectId, `INT. HARBORMASTER OFFICE - NIGHT\n\nThe ${TAG}kettle whistles.\n`);
  expect((await cast.sam.client.from('project_locations').insert({ project_id: projectId, name: `PIER ${TAG.toUpperCase()}` })).error).toBeNull();
  expect((await cast.sam.client.from('project_tasks').insert({ project_id: projectId, title: `Rent a fog machine ${TAG}` })).error).toBeNull();
  rileyProject = (await cast.riley.client.from('projects').insert({ title: `Lighthouse ${TAG} (Riley)`, creator_id: cast.riley.id, visibility: 'public' }).select('id').single()).data!.id;
  const admin = adminClient();
  expect((await admin.from('profiles').update({ role: 'Gaffer' }).eq('id', cast.jordan.id)).error).toBeNull();
  expect((await admin.from('profiles').update({ role: 'Gaffer', is_sample: true }).eq('id', nova.id)).error).toBeNull();
});
afterAll(async () => {
  await adminClient().from('projects').delete().eq('id', rileyProject);
  await destroyCast({ ...cast, nova });
});

const search = async (client: Cast['sam']['client'], q: string) => {
  const { data, error } = await client.rpc('search_suite', { p_query: q });
  expect(error).toBeNull();
  return data ?? [];
};

describe('search_suite', () => {
  it('finds your work by word starts, across kinds', async () => {
    const hits = await search(cast.sam.client, `${TAG}`);
    const kinds = new Set(hits.filter((h) => h.project_id === projectId).map((h) => h.kind));
    expect([...kinds].sort()).toEqual(['location', 'project', 'script', 'task']);
    const script = (await search(cast.sam.client, 'harbormas nig')).find((h) => h.kind === 'script' && h.project_id === projectId);
    expect(script?.detail).toContain('HARBORMASTER');
    // Punctuation separates words: "harbormaster_office" is two word starts.
    expect((await search(cast.sam.client, 'harbormaster_office')).some((h) => h.kind === 'script' && h.project_id === projectId)).toBe(true);
  });

  it('is only your work: someone else’s public project stays out', async () => {
    const hits = await search(cast.sam.client, `lighthouse ${TAG}`);
    expect(hits.some((h) => h.id === rileyProject)).toBe(false);
    expect(hits.some((h) => h.id === projectId && h.kind === 'project')).toBe(true);
  });

  it('crew find the production’s work; outsiders find none of it', async () => {
    expect((await search(cast.jordan.client, `${TAG}kettle`)).some((h) => h.kind === 'script' && h.project_id === projectId)).toBe(true);
    const riley = await search(cast.riley.client, TAG);
    expect(riley.filter((h) => h.project_id === projectId)).toEqual([]);
  });

  it('finds people by name and craft, not sample people', async () => {
    const admin = adminClient();
    const name = async (id: string) => (await admin.from('profiles').select('username').eq('id', id).single()).data!.username as string;
    const people = async (q: string) => (await search(cast.riley.client, q)).filter((h) => h.kind === 'person');
    expect(await people(`gaff ${await name(cast.jordan.id)}`)).toMatchObject([{ id: cast.jordan.id, detail: 'Gaffer' }]);
    expect(await people(await name(nova.id))).toEqual([]);
  });

  it('asks for nothing when there are no words, and needs a signed-in person', async () => {
    expect(await search(cast.sam.client, '   ')).toEqual([]);
    expect(await search(cast.sam.client, '&|!:*()')).toEqual([]);
    expect((await anonClient().rpc('search_suite', { p_query: TAG })).error).not.toBeNull();
  });
});

// `searchSuite` (lib/search) against the real database, as each persona.
describe('searchSuite', () => {
  it('returns [] without asking for empty, whitespace, single-character and symbol-only input', async () => {
    // The anon client would be refused by the database, so a [] here proves no call was made.
    const anon = anonClient();
    for (const q of ['', '   ', 'a', ' a ', '!', '&|!:*()', '--', '%_']) {
      expect(await searchSuite(q, 30, anon)).toEqual([]);
    }
  });

  it('finds work with two characters, and with special characters around the words', async () => {
    expect((await searchSuite(TAG, 30, cast.sam.client)).some((h) => h.id === projectId)).toBe(true);
    expect((await searchSuite(`  "${TAG}"!  `, 30, cast.sam.client)).some((h) => h.id === projectId)).toBe(true);
    expect((await searchSuite(`${TAG.slice(0, 2)}`, 30, cast.sam.client))).toBeInstanceOf(Array);
  });

  it('treats quotes, SQL, tsquery and LIKE syntax as plain text: no error, no leak, nothing damaged', async () => {
    const hostile = [`o'brien; drop table projects --`, `${TAG}' or '1'='1`, `${TAG}:* & !(x) | <->`, `${TAG}%`, `\\${TAG}_`, '𝒳𝒴 💥', 'a'.repeat(5000)];
    for (const q of hostile) {
      const hits = await searchSuite(q, 30, cast.riley.client);
      expect(hits.filter((h) => h.project_id === projectId)).toEqual([]);
    }
    expect((await searchSuite(TAG, 30, cast.sam.client)).some((h) => h.id === projectId)).toBe(true);
  });

  it('honours the limit', async () => {
    expect((await searchSuite(TAG, 1, cast.sam.client)).length).toBeLessThanOrEqual(1);
  });

  it('throws the database’s own error message when the call is refused', async () => {
    await expect(searchSuite(TAG, 30, anonClient())).rejects.toThrow(/permission denied|not authori[sz]ed|jwt/i);
  });
});
