import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject, createScript } from './support/project';
import { createStudioApi } from '@/lib/studio/api';
import { suitePriorsFromRows } from '@/lib/scriptos/suite-priors';

// The deep brain, the suite's context as priors: what the reader is told about a project comes from rows a person made (the
// bible, the breakdown, casting), read under the reader's own access. The shared scene index is built by whoever opens the
// script, so the owner and the crew must be told the SAME thing, and an outsider nothing. As personas: Sam owns, Jordan is
// crew, Riley is outside. No new table: this pins that the tables the priors read are readable alike by everyone who syncs.
let cast: Cast;
let projectId: string;
let scriptId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Suite priors'));
  scriptId = await createScript(cast, projectId, 'INT. MOTEL ROOM - NIGHT\n\nTHE BRIEFCASE\nIt sits open.\n\nMAYA\nWhere is it?\n');
  const sam = cast.sam.client;
  const bible = await sam.from('script_characters').insert([
    { script_id: scriptId, name: 'MAYA', full_name: 'Maya Ortiz', description: 'A night nurse.' },
    { script_id: scriptId, name: 'LEO' }, // empty: what the editor saves for every name it reads
  ]).select('id, name');
  if (bible.error) throw bible.error;
  const cats = await sam.from('breakdown_categories').select('id, key').eq('project_id', projectId);
  if (cats.error) throw cats.error;
  const cat = (key: string) => cats.data.find((c) => c.key === key)!.id;
  const els = await sam.from('breakdown_elements').insert([
    { project_id: projectId, category_id: cat('props'), name: 'Briefcase' },
    { project_id: projectId, category_id: cat('cast'), name: 'Abuela' },
    { project_id: projectId, category_id: cat('extras'), name: 'Cop #2' },
  ]);
  if (els.error) throw els.error;
  const cand = await sam.from('casting_candidates').insert({ project_id: projectId, character_name: 'IVY', name: 'Ana Reyes' });
  if (cand.error) throw cand.error;
});
afterAll(async () => { await destroyCast(cast); });

describe('what the suite tells the reader', () => {
  it('the owner is told the bible a person wrote, the breakdown and the roles being cast', async () => {
    const rows = await createStudioApi(cast.sam.client).listSuitePriorRows(projectId, scriptId);
    expect(rows.failed).toEqual([]);
    const p = suitePriorsFromRows(rows);
    expect(p.people.map((x) => `${x.name}:${x.source}`)).toEqual(['ABUELA:breakdown', 'IVY:casting', 'MAYA:bible', 'MAYA ORTIZ:bible']);
    expect(p.things).toEqual([{ name: 'BRIEFCASE', category: 'Props' }]);
  });

  it('the crew is told exactly the same, so the scene index is one reading whoever syncs it', async () => {
    const sam = suitePriorsFromRows(await createStudioApi(cast.sam.client).listSuitePriorRows(projectId, scriptId));
    const jordanRows = await createStudioApi(cast.jordan.client).listSuitePriorRows(projectId, scriptId);
    expect(jordanRows.failed).toEqual([]);
    expect(suitePriorsFromRows(jordanRows)).toEqual(sam);
  });

  it('an outsider is told nothing', async () => {
    const rows = await createStudioApi(cast.riley.client).listSuitePriorRows(projectId, scriptId);
    expect(rows.bible).toEqual([]);
    expect(rows.elements).toEqual([]);
    expect(rows.candidates).toEqual([]);
    expect(rows.lookBoards).toEqual([]);
    const p = suitePriorsFromRows(rows);
    expect(p.people).toEqual([]);
    expect(p.things).toEqual([]);
  });
});
