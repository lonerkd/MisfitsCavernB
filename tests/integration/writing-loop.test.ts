import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { localDay } from '@/lib/writing/core';

// The writing loop as personas: words and sprints add up through
// log_writing() within bounds, the day's goal is recorded, a writer's days
// are theirs alone, and nobody can write a streak by hand.
let cast: Cast;
const today = localDay();

beforeAll(async () => {
  cast = await createCast();
});

afterAll(async () => {
  await destroyCast(cast);
});

describe('writing loop', () => {
  it('typed words and a finished sprint add up on today’s row, with the goal of the day', async () => {
    const sam = cast.sam.client;
    expect((await sam.from('profiles').update({ daily_word_goal: 750 }).eq('id', cast.sam.id)).error).toBeNull();
    expect((await sam.rpc('log_writing', { p_day: today, p_words: 120 })).error).toBeNull();
    const { data, error } = await sam.rpc('log_writing', { p_day: today, p_words: 80, p_sprint: true });
    expect(error).toBeNull();
    expect(data).toMatchObject({ day: today, words: 200, sprints: 1, goal: 750 });
  });

  it('refuses nonsense: too many words at once, a day far away, a goal out of range', async () => {
    const sam = cast.sam.client;
    expect((await sam.rpc('log_writing', { p_day: today, p_words: 5001 })).error).not.toBeNull();
    expect((await sam.rpc('log_writing', { p_day: today, p_words: -1 })).error).not.toBeNull();
    expect((await sam.rpc('log_writing', { p_day: '2020-01-01', p_words: 10 })).error).not.toBeNull();
    expect((await sam.from('profiles').update({ daily_word_goal: 10 }).eq('id', cast.sam.id)).error).not.toBeNull();
    expect((await sam.from('profiles').update({ sprint_minutes: 500 }).eq('id', cast.sam.id)).error).not.toBeNull();
  });

  it('a streak can’t be written by hand', async () => {
    const sam = cast.sam.client;
    expect((await sam.from('writing_days').insert({ user_id: cast.sam.id, day: '2026-01-01', words: 9000, goal: 500 })).error).not.toBeNull();
    const { data } = await sam.from('writing_days').update({ words: 99999 }).eq('user_id', cast.sam.id).select('words');
    expect(data ?? []).toEqual([]);
  });

  it('the goal and sprint length come back to their owner only', async () => {
    expect((await cast.sam.client.rpc('get_my_writing_prefs')).data).toEqual([{ daily_word_goal: 750, sprint_minutes: 15 }]);
    expect((await cast.riley.client.from('profiles').select('daily_word_goal').eq('id', cast.sam.id)).error).not.toBeNull();
    expect((await anonClient().rpc('get_my_writing_prefs')).error).not.toBeNull();
  });

  it('a writer’s days are theirs alone; signed-out callers can’t log', async () => {
    expect((await cast.riley.client.from('writing_days').select('day').eq('user_id', cast.sam.id)).data).toEqual([]);
    expect((await cast.sam.client.from('writing_days').select('words').eq('user_id', cast.sam.id)).data).toEqual([{ words: 200 }]);
    expect((await anonClient().rpc('log_writing', { p_day: today, p_words: 5 })).error).not.toBeNull();
  });
});
