import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client as Pg } from 'pg';
import { randomUUID } from 'node:crypto';
import { createCast, destroyCast, createPersona, type Cast, type Persona } from './support/personas';

// A script's live co-writing channel (`script_<id>`) is private: Realtime Authorization checks the topic against
// policies on realtime.messages. Driven here the way Realtime drives them: as the `authenticated` role with the
// person's JWT claims and the joined topic set for the transaction, then a real read / insert on realtime.messages.
// Sam owns the project, Jordan is crew, Casey is a view-only member, Riley is an outsider. The scripts table lets
// every member update the script, so the channel follows with the same helper: members read and write, others neither.
let cast: Cast;
let viewer: Persona;
let scriptId: string;
let personalScriptId: string;

const MESSAGE = `insert into realtime.messages (topic, extension, payload, event, private) values ($1, 'broadcast', '{}'::jsonb, 'yjs_update', true)`;

async function inTransaction<T>(run: (pg: Pg) => Promise<T>): Promise<T> {
  const pg = new Pg({ connectionString: process.env.SUPABASE_TEST_DB_URL });
  await pg.connect();
  try {
    await pg.query('begin');
    return await run(pg);
  } finally {
    await pg.query('rollback').catch(() => {});
    await pg.end();
  }
}

async function actAs(pg: Pg, userId: string, topic: string): Promise<void> {
  await pg.query('set local role authenticated');
  await pg.query(`select set_config('request.jwt.claims', $1, true), set_config('realtime.topic', $2, true)`,
    [JSON.stringify({ sub: userId, role: 'authenticated' }), topic]);
}

/** Can this person receive on the topic? A message is placed with no RLS, then read back under the person's policies. */
function canRead(userId: string, topic: string): Promise<boolean> {
  return inTransaction(async (pg) => {
    await pg.query(MESSAGE, [topic]);
    await actAs(pg, userId, topic);
    const { rows } = await pg.query('select 1 from realtime.messages where topic = $1', [topic]);
    return rows.length > 0;
  });
}

function canWrite(userId: string, topic: string): Promise<boolean> {
  return inTransaction(async (pg) => {
    await actAs(pg, userId, topic);
    try {
      await pg.query(MESSAGE, [topic]);
      return true;
    } catch (e) {
      if ((e as { code?: string }).code === '42501') return false; // violates row-level security
      throw e;
    }
  });
}

beforeAll(async () => {
  cast = await createCast();
  viewer = await createPersona('casey');
  const project = await cast.sam.client.from('projects').insert({ title: 'Private Channel', creator_id: cast.sam.id }).select('id').single();
  if (project.error) throw project.error;
  const crew = await cast.sam.client.from('project_crew').insert([
    { project_id: project.data.id, user_id: cast.jordan.id, craft: 'Writer', role: 'contributor', status: 'confirmed' },
    { project_id: project.data.id, user_id: viewer.id, craft: 'Script supervisor', role: 'viewer', status: 'confirmed' },
  ]);
  if (crew.error) throw crew.error;
  const script = await cast.sam.client.from('scripts')
    .insert({ title: 'Channel', content: 'INT. CAVE - NIGHT', created_by: cast.sam.id, last_edited_by: cast.sam.id, project_id: project.data.id, status: 'draft' })
    .select('id').single();
  if (script.error) throw script.error;
  scriptId = script.data.id;
  projectId = project.data.id;
  // A personal script of Riley's: nobody else may reach it through its channel.
  const mine = await cast.riley.client.from('scripts')
    .insert({ title: 'Private', content: 'x', created_by: cast.riley.id, last_edited_by: cast.riley.id, status: 'draft' })
    .select('id').single();
  if (mine.error) throw mine.error;
  personalScriptId = mine.data.id;
});

let projectId: string;

afterAll(async () => {
  await destroyCast({ ...cast, viewer });
});

describe('script_<id> channel: private, for people who can access the script', () => {
  it('the owner reads and writes', async () => {
    expect(await canRead(cast.sam.id, `script_${scriptId}`)).toBe(true);
    expect(await canWrite(cast.sam.id, `script_${scriptId}`)).toBe(true);
  });

  it('crew on the project read and write', async () => {
    expect(await canRead(cast.jordan.id, `script_${scriptId}`)).toBe(true);
    expect(await canWrite(cast.jordan.id, `script_${scriptId}`)).toBe(true);
  });

  it('a view-only member can do on the channel what the scripts table lets them do to the script', async () => {
    expect(await canRead(viewer.id, `script_${scriptId}`)).toBe(true);
    const updated = await viewer.client.from('scripts').update({ title: 'Channel (viewer)' }).eq('id', scriptId).select('id');
    expect(await canWrite(viewer.id, `script_${scriptId}`)).toBe((updated.data?.length ?? 0) === 1);
  });

  it('an outsider neither reads nor writes', async () => {
    expect(await canRead(cast.riley.id, `script_${scriptId}`)).toBe(false);
    expect(await canWrite(cast.riley.id, `script_${scriptId}`)).toBe(false);
  });

  it('a personal script\'s channel is its author\'s alone', async () => {
    expect(await canRead(cast.riley.id, `script_${personalScriptId}`)).toBe(true);
    expect(await canRead(cast.sam.id, `script_${personalScriptId}`)).toBe(false);
    expect(await canWrite(cast.sam.id, `script_${personalScriptId}`)).toBe(false);
  });

  it('a script that does not exist, and topics that are not a script\'s, open for nobody', async () => {
    expect(await canRead(cast.sam.id, `script_${randomUUID()}`)).toBe(false);
    expect(await canWrite(cast.sam.id, `script_${randomUUID()}`)).toBe(false);
    expect(await canRead(cast.sam.id, 'script_not-a-uuid')).toBe(false);
    expect(await canWrite(cast.sam.id, `voice:${scriptId}`)).toBe(false);
  });

  it('the policies are on realtime.messages, one SELECT and one INSERT, for signed-in people only', async () => {
    const { rows } = await inTransaction((pg) => pg.query(
      `select cmd, roles::text from pg_policies where schemaname = 'realtime' and tablename = 'messages' and policyname like 'realtime: topic%' order by cmd`));
    expect(rows.map((r) => r.cmd)).toEqual(['INSERT', 'SELECT']);
    for (const r of rows) expect(r.roles).toBe('{authenticated}');
  });
});

describe('every other topic is private too, by who it belongs to', () => {
  it("project topics: the project's people, not an outsider", async () => {
    for (const t of [`presence:project_${projectId}`, `project:${projectId}`, `prod-records:${projectId}:gear`, `activity:${projectId}:x1`]) {
      expect(await canRead(cast.jordan.id, t)).toBe(true);
      expect(await canRead(cast.riley.id, t)).toBe(false);
    }
    expect(await canWrite(cast.jordan.id, `presence:project_${projectId}`)).toBe(true);
    expect(await canWrite(cast.riley.id, `presence:project_${projectId}`)).toBe(false);
    expect(await canWrite(cast.jordan.id, `project:${projectId}`)).toBe(false);
  });

  it("a person's own topics are theirs alone", async () => {
    expect(await canRead(cast.sam.id, `notif-${cast.sam.id}-abc`)).toBe(true);
    expect(await canRead(cast.riley.id, `notif-${cast.sam.id}-abc`)).toBe(false);
    expect(await canRead(cast.sam.id, `lounge-unread:${cast.sam.id}`)).toBe(true);
    expect(await canRead(cast.riley.id, `lounge-unread:${cast.sam.id}`)).toBe(false);
    const pair = [cast.sam.id, cast.jordan.id].sort().join(':');
    expect(await canRead(cast.jordan.id, `dm:${pair}`)).toBe(true);
    expect(await canRead(cast.riley.id, `dm:${pair}`)).toBe(false);
  });

  it('the suite-wide topics are open to anyone signed in; an unknown topic to nobody', async () => {
    expect(await canRead(cast.riley.id, 'lounge-presence')).toBe(true);
    expect(await canWrite(cast.riley.id, 'lounge-presence')).toBe(true);
    expect(await canRead(cast.riley.id, 'projects:list')).toBe(true);
    expect(await canRead(cast.riley.id, 'live:tasks:all:x')).toBe(true);
    expect(await canRead(cast.sam.id, 'anything-else')).toBe(false);
    expect(await canWrite(cast.sam.id, 'projects:list')).toBe(false);
  });
});
