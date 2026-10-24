import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// The brief catalogue: everyone reads it, only an admin writes it, and
// removing a question takes every project's answer to it along.
let cast: Cast;
let projectId: string;
const KEY = 'qa_admin_probe';
const row = { key: KEY, phase: 'development', label: 'Probe?', kind: 'one', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], position: 900 };

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'BriefAdmin'));
});

afterAll(async () => {
  await adminClient().from('brief_questions').delete().eq('key', KEY);
  await destroyCast(cast);
});

describe('brief catalogue writes', () => {
  it('anyone reads it, even signed out', async () => {
    const { data, error } = await anonClient().from('brief_questions').select('key').limit(1);
    expect(error).toBeNull();
    expect(data!.length).toBe(1);
  });

  it('owner, crew and outsider cannot add, change or remove a question', async () => {
    for (const who of [cast.sam, cast.jordan, cast.riley]) {
      expect((await who.client.from('brief_questions').insert(row)).error).not.toBeNull();
      const upd = await who.client.from('brief_questions').update({ label: 'Hacked' }).eq('key', 'goal').select('key');
      expect(upd.data ?? []).toEqual([]);
      const del = await who.client.from('brief_questions').delete().eq('key', 'goal').select('key');
      expect(del.data ?? []).toEqual([]);
    }
    expect((await anonClient().from('brief_questions').insert(row)).error).not.toBeNull();
  });

  it('an admin adds one; the shape is checked', async () => {
    const admin = adminClient();
    expect((await admin.from('brief_questions').insert({ ...row, options: [] })).error).not.toBeNull();
    expect((await admin.from('brief_questions').insert(row)).error).toBeNull();
  });

  it('removing a question deletes the projects’ answers, and only an admin can count them all', async () => {
    const admin = adminClient();
    expect((await cast.sam.client.from('project_brief').upsert({ project_id: projectId, question: KEY, value: 'a' })).error).toBeNull();
    expect((await cast.riley.client.from('project_brief').select('question').eq('question', KEY)).data ?? []).toEqual([]);
    expect((await admin.from('brief_questions').delete().eq('key', KEY)).error).toBeNull();
    const left = await admin.from('project_brief').select('question').eq('project_id', projectId).eq('question', KEY);
    expect(left.data ?? []).toEqual([]);
  });
});
