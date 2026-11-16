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

// The admin screen's two functions: moving a question inside its phase, and
// removing one with an audit-log entry. Sam is made the platform admin here;
// Jordan (crew), Riley (outsider) and anon are refused.
describe('brief question admin functions', () => {
  const A = 'qa_move_a';
  const B = 'qa_move_b';
  const C = 'qa_move_c';
  const mk = (key: string, position: number) => ({ ...row, key, position, phase: 'delivery' });

  beforeAll(async () => {
    await adminClient().from('profiles').update({ is_admin: true }).eq('id', cast.sam.id);
    await adminClient().from('brief_questions').delete().in('key', [A, B, C]);
    expect((await adminClient().from('brief_questions').insert([mk(A, 5000), mk(B, 5000), mk(C, 5001)])).error).toBeNull();
  });
  afterAll(async () => {
    await adminClient().from('brief_questions').delete().in('key', [A, B, C]);
    await adminClient().from('audit_logs').delete().in('resource_id', [A, B, C]);
  });

  const order = async () => {
    const { data } = await adminClient().from('brief_questions').select('key, position').eq('phase', 'delivery').order('position').order('key');
    return (data ?? []).map((r) => r.key).filter((k) => [A, B, C].includes(k));
  };

  it('crew, an outsider and anon cannot move or remove a question', async () => {
    for (const who of [cast.jordan, cast.riley]) {
      expect((await who.client.rpc('admin_move_brief_question', { p_key: A, p_direction: 1 })).error).not.toBeNull();
      expect((await who.client.rpc('admin_remove_brief_question', { p_key: A })).error).not.toBeNull();
    }
    expect((await anonClient().rpc('admin_move_brief_question', { p_key: A, p_direction: 1 })).error).not.toBeNull();
    expect((await anonClient().rpc('admin_remove_brief_question', { p_key: A })).error).not.toBeNull();
    expect(await order()).toEqual([A, B, C]);
  });

  it('an admin moves a question one place, even among equal positions; an end does nothing', async () => {
    const sam = cast.sam.client;
    expect((await sam.rpc('admin_move_brief_question', { p_key: A, p_direction: 1 })).error).toBeNull();
    expect(await order()).toEqual([B, A, C]);
    expect((await sam.rpc('admin_move_brief_question', { p_key: A, p_direction: -1 })).error).toBeNull();
    expect(await order()).toEqual([A, B, C]);
    expect((await sam.rpc('admin_move_brief_question', { p_key: A, p_direction: -1 })).error).toBeNull();
    expect(await order()).toEqual([A, B, C]);
    expect((await sam.rpc('admin_move_brief_question', { p_key: A, p_direction: 0 })).error).not.toBeNull();
    expect((await sam.rpc('admin_move_brief_question', { p_key: 'no_such_question', p_direction: 1 })).error).not.toBeNull();
  });

  it('an admin edits the words and the rules through the table; an outsider cannot', async () => {
    const upd = await cast.sam.client.from('brief_questions').update({
      label: 'Edited?', hint: 'New help',
      ask_when: { formats: ['Feature film'] },
      options: [{ id: 'a', label: 'A', implies: { crafts: ['Gaffer'], pages_per_day: 3 }, detect: { words: ['rain'] } }, { id: 'b', label: 'B' }],
    }).eq('key', B).select('key, label, hint, ask_when, options');
    expect(upd.error).toBeNull();
    expect(upd.data![0].label).toBe('Edited?');
    expect(upd.data![0].ask_when).toEqual({ formats: ['Feature film'] });
    const riley = await cast.riley.client.from('brief_questions').update({ label: 'Hacked' }).eq('key', B).select('key');
    expect(riley.data ?? []).toEqual([]);
  });

  it('removing a question as an admin deletes its answers and writes an audit-log entry', async () => {
    expect((await cast.sam.client.from('project_brief').upsert({ project_id: projectId, question: C, value: 'a' })).error).toBeNull();
    expect((await cast.sam.client.rpc('admin_remove_brief_question', { p_key: C })).error).toBeNull();
    expect((await adminClient().from('brief_questions').select('key').eq('key', C)).data ?? []).toEqual([]);
    expect((await adminClient().from('project_brief').select('question').eq('question', C)).data ?? []).toEqual([]);
    const log = (await adminClient().from('audit_logs').select('user_id, action, resource_type, details').eq('resource_id', C)).data ?? [];
    expect(log).toEqual([{ user_id: cast.sam.id, action: 'admin_remove_brief_question', resource_type: 'brief_question', details: { label: 'Probe?', phase: 'delivery', answers_deleted: 1 } }]);
    expect((await cast.sam.client.rpc('admin_remove_brief_question', { p_key: C })).error).not.toBeNull();
  });
});
