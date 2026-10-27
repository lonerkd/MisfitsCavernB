import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Client as Pg } from 'pg';
import { anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// The film graph's backfill (spec §6 step 2): fill places, days and characters
// from today's text. The spec says near-identical names are never guessed
// together. This runs the migrations' own backfill SQL, taken verbatim from the
// files, over legacy-shaped rows (text only, no links, triggers off) inside a
// transaction that is rolled back, and reads what it made.
let cast: Cast;
let projectId: string;
let otherProjectId: string;

const migration = (name: string) => readFileSync(path.join(__dirname, '../../supabase/migrations', name), 'utf8');
// The block between the "What's already there" and "Keeping them in step" banners.
function backfillOf(sql: string) {
  const start = sql.indexOf("-- ── What's already there");
  const end = sql.indexOf('-- ── Keeping them in step');
  if (start < 0 || end < start) throw new Error('backfill block not found in migration');
  return sql.slice(start, end);
}
const PLACES = backfillOf(migration('20261010010000_film_graph_days_and_places.sql'));
const PEOPLE = backfillOf(migration('20261011010000_film_graph_people_in_scenes.sql'));

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Film graph backfill'));
  ({ projectId: otherProjectId } = await createCrewedProject(cast, 'Another film graph backfill'));
});
afterAll(async () => { await destroyCast(cast); });

type Legacy = { location?: string | null; cast_list?: string | null };
async function backfill(scenes: Legacy[], run: (pg: Pg, ids: string[]) => Promise<void>) {
  const pg = new Pg({ connectionString: process.env.SUPABASE_TEST_DB_URL });
  await pg.connect();
  try {
    await pg.query('begin');
    // Legacy rows: the text exists, nothing derived from it does yet.
    await pg.query('alter table public.scenes disable trigger user');
    const ids: string[] = [];
    for (const [i, s] of scenes.entries()) {
      const { rows } = await pg.query(
        'insert into public.scenes (project_id, scene_number, title, location, cast_list) values ($1, $2, $3, $4, $5) returning id',
        [projectId, 9000 + i, `Legacy ${i}`, s.location ?? null, s.cast_list ?? null],
      );
      ids.push(rows[0].id);
    }
    await pg.query('alter table public.scenes enable trigger user');
    await pg.query(PLACES);
    await pg.query(PEOPLE);
    await run(pg, ids);
  } finally {
    await pg.query('rollback').catch(() => undefined);
    await pg.end();
  }
}
let sceneNumber = 9900;
async function addScene(cast_list: string, location: string, project = projectId) {
  const { error } = await cast.sam.client.from('scenes').insert({
    project_id: project,
    scene_number: sceneNumber++,
    title: 'Ambiguous name candidate',
    cast_list,
    location,
  });
  if (error) throw error;
}
const names = async (pg: Pg, table: 'project_locations' | 'characters') =>
  (await pg.query(`select name from public.${table} where project_id = $1 order by name`, [projectId])).rows.map((r) => r.name as string);

describe('backfill of places', () => {
  it('joins only spellings that normalise to the same name (case, outer spaces)', async () => {
    await backfill([{ location: 'Kitchen' }, { location: '  KITCHEN ' }, { location: 'kitchen' }], async (pg, ids) => {
      expect(await names(pg, 'project_locations')).toEqual(['KITCHEN']);
      const { rows } = await pg.query('select location_id from public.scenes where id = any($1)', [ids]);
      expect(new Set(rows.map((r) => r.location_id)).size).toBe(1);
      expect(rows[0].location_id).not.toBeNull();
    });
  });

  it('keeps near-identical names apart instead of guessing they are one place', async () => {
    const near = ['COFFEE SHOP', 'COFFEE  SHOP', 'COFFEE SHOPS', 'COFFEE-SHOP', 'KITCHEN', 'KITCHEN.'];
    await backfill(near.map((location) => ({ location })), async (pg, ids) => {
      expect(await names(pg, 'project_locations')).toEqual([...near].sort());
      const { rows } = await pg.query('select location_id from public.scenes where id = any($1)', [ids]);
      expect(new Set(rows.map((r) => r.location_id)).size).toBe(near.length);
    });
  });

  it('leaves a blank or over-long location unlinked rather than inventing a place', async () => {
    await backfill([{ location: '   ' }, { location: 'X'.repeat(201) }, { location: null }], async (pg, ids) => {
      expect(await names(pg, 'project_locations')).toEqual([]);
      const { rows } = await pg.query('select location_id, location from public.scenes where id = any($1)', [ids]);
      expect(rows.every((r) => r.location_id === null)).toBe(true);
      expect(rows.map((r) => r.location).includes('X'.repeat(201))).toBe(true); // the text is untouched
    });
  });
});

describe('backfill of characters', () => {
  it('makes one character per normalised cue and links each scene to it', async () => {
    await backfill([{ cast_list: 'maya, Leo ,MAYA' }, { cast_list: ' Leo' }], async (pg, ids) => {
      expect(await names(pg, 'characters')).toEqual(['LEO', 'MAYA']);
      const { rows } = await pg.query(
        'select sc.scene_id, c.name from public.scene_characters sc join public.characters c on c.id = sc.character_id where sc.scene_id = any($1) order by 2',
        [ids],
      );
      expect(rows.filter((r) => r.scene_id === ids[0]).map((r) => r.name)).toEqual(['LEO', 'MAYA']);
      expect(rows.filter((r) => r.scene_id === ids[1]).map((r) => r.name)).toEqual(['LEO']);
    });
  });

  it('keeps a cue spelled two ways as two characters, never merged by similarity', async () => {
    const cues = ['JOHN', 'JOHN (V.O.)', 'JON', 'DR. SMITH', 'DR SMITH', 'MARY ANN', 'MARYANN'];
    await backfill(cues.map((c) => ({ cast_list: c })), async (pg) => {
      expect(await names(pg, 'characters')).toEqual([...cues].sort());
    });
  });

  it('does not change the cast_list text it read', async () => {
    await backfill([{ cast_list: 'maya, JON' }], async (pg, ids) => {
      const { rows } = await pg.query('select cast_list from public.scenes where id = $1', [ids[0]]);
      expect(rows[0].cast_list).toBe('maya, JON');
    });
  });
});

describe('listing ambiguous matches for a person to settle', () => {
  it('lists near-identical place names (COFFEE SHOP / COFFEE  SHOP) for review', async () => {
    await backfill([{ location: 'COFFEE SHOP' }, { location: 'COFFEE  SHOP' }], async (pg) => {
      expect(await names(pg, 'project_locations')).toEqual(['COFFEE  SHOP', 'COFFEE SHOP']);
      const { rows } = await pg.query(
        "select entity_type, name_a, name_b from public.film_graph_ambiguous_names where project_id = $1 and entity_type = 'location'",
        [projectId],
      );
      expect(rows.map((r) => [r.entity_type, ...[r.name_a, r.name_b].sort()])).toEqual([
        ['location', 'COFFEE  SHOP', 'COFFEE SHOP'],
      ]);
    });
  });

  it('lists cues that may be the same character (DR. SMITH / DR SMITH) for review', async () => {
    await backfill([{ cast_list: 'DR. SMITH' }, { cast_list: 'DR SMITH' }], async (pg) => {
      expect(await names(pg, 'characters')).toEqual(['DR SMITH', 'DR. SMITH']);
      const { rows } = await pg.query(
        "select entity_type, name_a, name_b from public.film_graph_ambiguous_names where project_id = $1 and entity_type = 'character'",
        [projectId],
      );
      expect(rows.map((r) => [r.entity_type, ...[r.name_a, r.name_b].sort()])).toEqual([
        ['character', 'DR SMITH', 'DR. SMITH'],
      ]);
    });
  });

  it('shows each project report only to its owner and crew', async () => {
    await addScene('DR. SMITH', 'COFFEE SHOP');
    await addScene('DR SMITH', 'COFFEE  SHOP');
    await addScene('OTHER', 'OLD ROOM', otherProjectId);
    await addScene('OTHER.', 'OLD  ROOM', otherProjectId);

    const report = async (client: typeof cast.sam.client, id: string) => {
      const { data, error } = await client
        .from('film_graph_ambiguous_names')
        .select('project_id, entity_type, name_a, name_b')
        .eq('project_id', id)
        .order('entity_type');
      if (error) throw error;
      return data;
    };

    const expected = [
      { project_id: projectId, entity_type: 'character', name_a: 'DR SMITH', name_b: 'DR. SMITH' },
      { project_id: projectId, entity_type: 'location', name_a: 'COFFEE  SHOP', name_b: 'COFFEE SHOP' },
    ];
    expect(await report(cast.sam.client, projectId)).toEqual(expected);
    expect(await report(cast.jordan.client, projectId)).toEqual(expected);
    expect(await report(cast.riley.client, projectId)).toEqual([]);
    expect(await report(cast.sam.client, otherProjectId)).toEqual([
      { project_id: otherProjectId, entity_type: 'character', name_a: 'OTHER', name_b: 'OTHER.' },
      { project_id: otherProjectId, entity_type: 'location', name_a: 'OLD  ROOM', name_b: 'OLD ROOM' },
    ]);

    const { error } = await anonClient().from('film_graph_ambiguous_names').select('project_id');
    expect(error).not.toBeNull();
  });
});
