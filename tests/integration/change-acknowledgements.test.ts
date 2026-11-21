import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, createCast, destroyCast, anonClient, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// A person a director's change touches says "seen". Sam owns, Jordan is crew, Riley is outside.
let cast: Cast;
let projectId: string;
const NOTE = 'note-1';

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Change acks'));
});
afterAll(async () => { await destroyCast(cast); });

describe('acknowledging a director’s change', () => {
  it('crew acknowledge as themselves, once; the owner too', async () => {
    const a = await cast.jordan.client.from('change_acknowledgements').insert({ project_id: projectId, note_id: NOTE, user_id: cast.jordan.id });
    expect(a.error).toBeNull();
    expect((await cast.jordan.client.from('change_acknowledgements').insert({ project_id: projectId, note_id: NOTE, user_id: cast.jordan.id })).error).not.toBeNull();
    expect((await cast.sam.client.from('change_acknowledgements').insert({ project_id: projectId, note_id: NOTE, user_id: cast.sam.id })).error).toBeNull();
  });

  it('nobody acknowledges in another person’s name; an outsider and anon cannot at all', async () => {
    expect((await cast.jordan.client.from('change_acknowledgements').insert({ project_id: projectId, note_id: 'n2', user_id: cast.sam.id })).error).not.toBeNull();
    expect((await cast.riley.client.from('change_acknowledgements').insert({ project_id: projectId, note_id: NOTE, user_id: cast.riley.id })).error).not.toBeNull();
    expect((await anonClient().from('change_acknowledgements').insert({ project_id: projectId, note_id: NOTE, user_id: cast.riley.id })).error).not.toBeNull();
  });

  it('the owner and the people who shape the project (Jordan is a contributor) see everyone’s; an outsider and anon see none', async () => {
    expect((await cast.sam.client.from('change_acknowledgements').select('user_id').eq('note_id', NOTE)).data).toHaveLength(2);
    expect((await cast.jordan.client.from('change_acknowledgements').select('user_id').eq('note_id', NOTE)).data).toHaveLength(2);
    expect((await cast.riley.client.from('change_acknowledgements').select('user_id').eq('note_id', NOTE)).data).toEqual([]);
    expect((await anonClient().from('change_acknowledgements').select('user_id').eq('note_id', NOTE)).data ?? []).toEqual([]);
  });

  it('a person takes back only their own', async () => {
    await cast.jordan.client.from('change_acknowledgements').delete().eq('note_id', NOTE).eq('user_id', cast.sam.id);
    expect((await adminClient().from('change_acknowledgements').select('user_id').eq('note_id', NOTE).eq('user_id', cast.sam.id)).data).toHaveLength(1);
    await cast.jordan.client.from('change_acknowledgements').delete().eq('note_id', NOTE).eq('user_id', cast.jordan.id);
    expect((await adminClient().from('change_acknowledgements').select('user_id').eq('note_id', NOTE).eq('user_id', cast.jordan.id)).data).toEqual([]);
  });
});
