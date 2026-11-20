import { describe, it, expect, vi, beforeEach } from 'vitest';

// The scene lookup chain: from('scenes').select().eq().eq().is().maybeSingle() → next queued result.
let lookups: Array<{ data: { id: string } | null; error: null }> = [];
let lookupCalls = 0;
vi.mock('@/lib/supabase/client', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    maybeSingle: async () => { lookupCalls++; return lookups.shift() ?? { data: null, error: null }; },
  };
  return { supabase: { from: () => chain } };
});

const attach = vi.fn(async (_projectId: string, _from: string, _to: string) => ({ id: 'link1' }));
vi.mock('@/lib/film/links', () => ({ attach: (projectId: string, from: string, to: string) => attach(projectId, from, to) }));

import { linkNoteToScene } from './annotations';

const note = { id: 'n1', project_id: 'p1' };
const noWait = { wait: async () => {} };

beforeEach(() => {
  lookups = [];
  lookupCalls = 0;
  attach.mockClear();
});

describe('linkNoteToScene', () => {
  it('attaches once when the scene is found on the first try', async () => {
    lookups = [{ data: { id: 's1' }, error: null }];
    await linkNoteToScene(note, 'script1', 3, noWait);
    expect(lookupCalls).toBe(1);
    expect(attach).toHaveBeenCalledTimes(1);
    expect(attach).toHaveBeenCalledWith('p1', 'n1', 's1');
  });

  it('retries and attaches once when the scene is found on the third try', async () => {
    lookups = [{ data: null, error: null }, { data: null, error: null }, { data: { id: 's1' }, error: null }];
    const wait = vi.fn(async () => {});
    await linkNoteToScene(note, 'script1', 3, { wait, delayMs: 1500 });
    expect(lookupCalls).toBe(3);
    expect(wait).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(1500);
    expect(attach).toHaveBeenCalledTimes(1);
    expect(attach).toHaveBeenCalledWith('p1', 'n1', 's1');
  });

  it('gives up after the retries without attaching and without throwing', async () => {
    lookups = [];
    await expect(linkNoteToScene(note, 'script1', 3, noWait)).resolves.toBeUndefined();
    expect(lookupCalls).toBe(4);
    expect(attach).not.toHaveBeenCalled();
  });
});
