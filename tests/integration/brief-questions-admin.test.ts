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

// Options and answers: project_brief.value names an option by id, so an admin
// cannot drop an answered option with a plain update (the guard trigger), and
// admin_remove_brief_option clears the answers in the same transaction.
describe('brief options and their answers', () => {
  const ONE = 'qa_opt_one';
  const MANY = 'qa_opt_many';
  const DEP = 'qa_opt_dep';
  const opts = (...ids: string[]) => ids.map((id) => ({ id, label: id.toUpperCase() }));
  const mk = (key: string, kind: 'one' | 'many', ids: string[], extra: Record<string, unknown> = {}) => ({ ...row, key, kind, options: opts(...ids), position: 9000, phase: 'delivery', ask_when: {}, ...extra }); // every row names ask_when: a bulk insert with mixed keys sends null for the missing ones
  let project2: string;

  beforeAll(async () => {
    await adminClient().from('profiles').update({ is_admin: true }).eq('id', cast.sam.id);
    ({ projectId: project2 } = await createCrewedProject(cast, 'BriefAdmin2'));
    await adminClient().from('brief_questions').delete().in('key', [ONE, MANY, DEP]);
    expect((await adminClient().from('brief_questions').insert([
      mk(ONE, 'one', ['a', 'b', 'c']),
      mk(MANY, 'many', ['a', 'b', 'c']),
      mk(DEP, 'one', ['x', 'y'], { ask_when: { answer: { [MANY]: ['b'] } } }),
    ])).error).toBeNull();
    const sam = cast.sam.client;
    expect((await sam.from('project_brief').upsert([
      { project_id: projectId, question: ONE, value: 'a' },
      { project_id: projectId, question: MANY, value: ['a', 'b'] },
      { project_id: project2, question: MANY, value: ['a'] },
    ])).error).toBeNull();
  });
  afterAll(async () => {
    await adminClient().from('brief_questions').delete().in('key', [ONE, MANY, DEP]);
    await adminClient().from('audit_logs').delete().in('resource_id', [ONE, MANY, DEP]);
  });

  it('crew, an outsider and anon cannot count answers or remove an option', async () => {
    for (const who of [cast.jordan, cast.riley]) {
      expect((await who.client.rpc('admin_count_brief_answers', { p_key: ONE, p_option: 'a' })).error).not.toBeNull();
      expect((await who.client.rpc('admin_remove_brief_option', { p_key: ONE, p_option: 'c' })).error).not.toBeNull();
    }
    expect((await anonClient().rpc('admin_count_brief_answers', { p_key: ONE, p_option: 'a' })).error).not.toBeNull();
    expect((await anonClient().rpc('admin_remove_brief_option', { p_key: ONE, p_option: 'c' })).error).not.toBeNull();
    const still = (await adminClient().from('brief_questions').select('options').eq('key', ONE).single()).data!;
    expect((still.options as unknown[]).length).toBe(3);
  });

  it('an admin counts the answers to a question and to one option, across projects', async () => {
    const sam = cast.sam.client;
    expect((await sam.rpc('admin_count_brief_answers', { p_key: ONE, p_option: null as never })).data).toBe(1);
    expect((await sam.rpc('admin_count_brief_answers', { p_key: MANY, p_option: null as never })).data).toBe(2);
    expect((await sam.rpc('admin_count_brief_answers', { p_key: MANY, p_option: 'a' })).data).toBe(2);
    expect((await sam.rpc('admin_count_brief_answers', { p_key: MANY, p_option: 'b' })).data).toBe(1);
    expect((await sam.rpc('admin_count_brief_answers', { p_key: MANY, p_option: 'c' })).data).toBe(0);
  });

  it('a label, a new option and the phase change with a plain update; kind and answered options are guarded', async () => {
    const sam = cast.sam.client;
    const renamed = [{ id: 'a', label: 'Renamed' }, ...opts('b', 'c', 'd')];
    const ok = await sam.from('brief_questions').update({ phase: 'production', options: renamed }).eq('key', ONE).select('key, phase');
    expect(ok.error).toBeNull();
    expect(ok.data![0].phase).toBe('production');
    // An answered option (a) cannot be dropped by a plain update; an unanswered one (c) can.
    expect((await sam.from('brief_questions').update({ options: opts('b', 'c', 'd') }).eq('key', ONE).select('key')).error).not.toBeNull();
    expect((await sam.from('brief_questions').update({ options: [{ id: 'a', label: 'Renamed' }, ...opts('b', 'd')] }).eq('key', ONE).select('key')).error).toBeNull();
    // Kind cannot change while a project has answered; it can when none has.
    expect((await sam.from('brief_questions').update({ kind: 'many' }).eq('key', ONE).select('key')).error).not.toBeNull();
    expect((await sam.from('brief_questions').update({ kind: 'many' }).eq('key', DEP).select('key')).error).toBeNull();
    expect((await sam.from('brief_questions').update({ kind: 'one' }).eq('key', DEP).select('key')).error).toBeNull();
  });

  it('removal is refused when another question waits on the option, or when it would leave fewer than two', async () => {
    const sam = cast.sam.client;
    const waits = await sam.rpc('admin_remove_brief_option', { p_key: MANY, p_option: 'b' });
    expect(waits.error?.message).toMatch(/Asked only after this option/);
    expect((await adminClient().from('project_brief').select('value').eq('project_id', projectId).eq('question', MANY).single()).data!.value).toEqual(['a', 'b']);
    const few = await sam.rpc('admin_remove_brief_option', { p_key: DEP, p_option: 'x' });
    expect(few.error?.message).toMatch(/at least two/);
    expect((await sam.rpc('admin_remove_brief_option', { p_key: MANY, p_option: 'nope' })).error).not.toBeNull();
  });

  it('removing an option clears the answers that chose it, keeps the rest, and is audit-logged', async () => {
    const sam = cast.sam.client;
    const r = await sam.rpc('admin_remove_brief_option', { p_key: MANY, p_option: 'a' });
    expect(r.error).toBeNull();
    expect(r.data).toBe(2);
    const q = (await adminClient().from('brief_questions').select('options').eq('key', MANY).single()).data!;
    expect((q.options as { id: string }[]).map((o) => o.id)).toEqual(['b', 'c']);
    expect((await adminClient().from('project_brief').select('value').eq('project_id', projectId).eq('question', MANY).single()).data!.value).toEqual(['b']);
    expect((await adminClient().from('project_brief').select('value').eq('project_id', project2).eq('question', MANY)).data ?? []).toEqual([]);

    // A single-choice question: the answer that chose it is deleted.
    expect((await sam.rpc('admin_remove_brief_option', { p_key: ONE, p_option: 'a' })).data).toBe(1);
    expect((await adminClient().from('project_brief').select('value').eq('project_id', projectId).eq('question', ONE)).data ?? []).toEqual([]);

    const log = (await adminClient().from('audit_logs').select('user_id, action, details').eq('resource_id', MANY)).data ?? [];
    expect(log).toEqual([{ user_id: cast.sam.id, action: 'admin_remove_brief_option', details: { option: 'a', label: 'A', answers_cleared: 2 } }]);
  });
});
