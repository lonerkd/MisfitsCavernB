import { describe, it, expect, vi, beforeEach } from 'vitest';

// A tiny in-memory stand-in for the PostgREST chain: filters really filter, so the
// merge of linked + unlinked rows in casting.ts is exercised, not just described.
type Row = Record<string, unknown>;
const store = vi.hoisted(() => ({ rows: {} as Record<string, Row[]> }));

vi.mock('./client', () => ({
  supabase: {
    from: (table: string) => {
      const filters: Array<(r: Row) => boolean> = [];
      const b: Record<string, unknown> = {
        select: () => b,
        eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return b; },
        is: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return b; },
        order: () => b,
        insert: (row: Row) => { (store.rows[table] ??= []).push({ ...row }); return Promise.resolve({ error: null }); },
        then: (resolve: (v: { data: Row[]; error: null }) => void) =>
          resolve({ data: (store.rows[table] ?? []).filter((r) => filters.every((f) => f(r))), error: null }),
      };
      return b;
    },
  },
}));

import { listCastingNotes, addCastingNote, listCandidates, addCandidate } from './casting';

const CHAR = '3f2c1a9e-1b2c-4d5e-8f90-1a2b3c4d5e6f';
const OTHER = '9e8d7c6b-5a4f-4e3d-2c1b-0a9f8e7d6c5b';

beforeEach(() => { store.rows = {}; });

describe('casting notes keyed by character', () => {
  const seed = () => {
    store.rows.casting_notes = [
      { id: 'n1', project_id: 'p1', character_name: 'MAYA', character_id: CHAR, note: 'linked', created_at: '2026-11-20T00:00:00Z' },
      { id: 'n2', project_id: 'p1', character_name: 'MAYA', character_id: null, note: 'unlinked', created_at: '2026-11-22T00:00:00Z' },
      { id: 'n3', project_id: 'p1', character_name: 'MAYA', character_id: OTHER, note: 'another character', created_at: '2026-11-23T00:00:00Z' },
      { id: 'n4', project_id: 'p1', character_name: 'REX', character_id: null, note: 'another role', created_at: '2026-11-24T00:00:00Z' },
    ];
  };

  it('reads by id when the character is known, keeping the unlinked rows of that name', async () => {
    seed();
    const notes = await listCastingNotes('p1', 'Maya', CHAR);
    expect(notes.map((n) => n.id)).toEqual(['n2', 'n1']); // newest first, n3 and n4 left out
  });

  it('falls back to the name when there is no character id yet', async () => {
    seed();
    const notes = await listCastingNotes('p1', 'Maya');
    expect(notes.map((n) => n.id).sort()).toEqual(['n1', 'n2', 'n3']);
  });

  it('sends the character id when it is a real one, and leaves it to the trigger when it is not', async () => {
    await addCastingNote('p1', 'Maya', 'a note', 'u1', CHAR);
    expect(store.rows.casting_notes[0]).toMatchObject({ character_id: CHAR, character_name: 'MAYA' });
    await addCastingNote('p1', 'Maya', 'another', 'u1', 'Maya');
    expect(store.rows.casting_notes[1]).not.toHaveProperty('character_id');
  });
});

describe('casting candidates keyed by character', () => {
  const seed = () => {
    store.rows.casting_candidates = [
      { id: 'c1', project_id: 'p1', character_name: 'MAYA', character_id: CHAR, name: 'Ana', status: 'shortlisted', reel_url: null, note: null, user_id: null, created_at: '2026-11-20T00:00:00Z' },
      { id: 'c2', project_id: 'p1', character_name: 'MAYA', character_id: null, name: 'Bo', status: 'callback', reel_url: null, note: null, user_id: null, created_at: '2026-11-19T00:00:00Z' },
      { id: 'c3', project_id: 'p1', character_name: 'MAYA', character_id: OTHER, name: 'Cy', status: 'passed', reel_url: null, note: null, user_id: null, created_at: '2026-11-18T00:00:00Z' },
    ];
  };

  it('reads by id when the character is known, oldest first, unlinked rows included', async () => {
    seed();
    const rows = await listCandidates('p1', 'Maya', CHAR);
    expect(rows.map((r) => r.id)).toEqual(['c2', 'c1']);
  });

  it('sends the character id from the input when it is a real one only', async () => {
    await addCandidate('p1', 'Maya', { name: 'Ana', character_id: CHAR }, 'u1');
    expect(store.rows.casting_candidates[0]).toMatchObject({ character_id: CHAR, character_name: 'MAYA' });
    await addCandidate('p1', 'Maya', { name: 'Bo', character_id: 'Maya' }, 'u1');
    expect(store.rows.casting_candidates[1]).not.toHaveProperty('character_id');
  });
});
