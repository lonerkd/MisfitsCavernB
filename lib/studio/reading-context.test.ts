import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const calls: string[] = [];
let revisionRows: Array<{ snapshot: string }> | null = [{ snapshot: 'INT. KITCHEN - DAY\n\nMAYA\nWe should go.\n\nShe waits by the door.\n' }];
let scriptRow: { project_id: string; format: string } | null = { project_id: 'p1', format: 'screenplay' };

const builder = (table: string) => {
  const result = () => {
    if (table === 'scripts') return scriptRow ? { data: scriptRow, error: null } : { data: null, error: { message: 'no' } };
    if (table === 'character_castings') return { data: [{ character_name: 'Maya' }], error: null };
    if (table === 'script_revisions') return revisionRows ? { data: revisionRows, error: null } : { data: null, error: { message: 'denied' } };
    return { data: [], error: null };
  };
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order', 'limit']) b[m] = () => b;
  b.single = () => Promise.resolve(result());
  b.then = (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => Promise.resolve(result()).then(ok, bad);
  return b;
};
vi.mock('@/lib/supabase/client', () => ({ supabase: { from: (t: string) => { calls.push(t); return builder(t); } } }));
vi.mock('./index', () => ({
  studio: {
    listReadingCorrections: vi.fn(async () => [{ kind: 'not_character', name: 'DARKNESS' }]),
    listLineOverrides: vi.fn(async () => []),
    listLocations: vi.fn(async () => [{ name: 'Kitchen' }]),
    listSuitePriorRows: vi.fn(async () => ({ elements: [{ name: 'Briefcase', category_key: 'props', category_label: 'Props' }], bible: [{ name: 'LEO', notes: 'The brother.' }], failed: [] })),
  },
}));
import { forgetReadingContext, loadReadingContext } from './reading-context';

beforeEach(() => { calls.length = 0; forgetReadingContext(); revisionRows = [{ snapshot: 'INT. KITCHEN - DAY\n\nMAYA\nWe should go.\n\nShe waits by the door.\n' }]; scriptRow = { project_id: 'p1', format: 'screenplay' }; });
afterEach(() => vi.clearAllMocks());

describe('loadReadingContext: the context the editor reads with, for the surfaces that read a script outside it', () => {
  it('has the cast, the verdicts, the places and the previous draft', async () => {
    const ctx = await loadReadingContext('s1');
    expect(ctx.characters).toEqual(['MAYA', 'LEO']); // the cast, then the bible entry a person wrote
    expect(ctx.suite?.things).toEqual([{ name: 'BRIEFCASE', category: 'Props' }]);
    expect(ctx.suite?.people.map((p) => `${p.name}:${p.source}`)).toEqual(['LEO:bible', 'MAYA:cast']);
    expect(ctx.rejectedNames).toEqual(['DARKNESS']);
    expect(ctx.places).toEqual(['KITCHEN']);
    expect(ctx.previousDraft?.lines.find((l) => l.text === 'She waits by the door.')?.type).toBe('action');
    expect(ctx.writerMemory).toBeUndefined(); // a writer's private memory never shapes a shared read
  });

  it('is loaded once for a script however many surfaces ask, and again after it is forgotten', async () => {
    const a = loadReadingContext('s1');
    const b = loadReadingContext('s1');
    expect(a).toBe(b);
    await a;
    const reads = calls.length;
    await loadReadingContext('s1');
    expect(calls.length).toBe(reads);
    forgetReadingContext('s1');
    await loadReadingContext('s1');
    expect(calls.length).toBeGreaterThan(reads);
  });

  it('only fetches the newest revision, not every snapshot', async () => {
    await loadReadingContext('s1');
    expect(calls.filter((t) => t === 'script_revisions')).toHaveLength(1);
  });

  it('a revision this person cannot open leaves the previous draft out; a script it cannot read gives an empty context', async () => {
    revisionRows = null;
    const ctx = await loadReadingContext('s1');
    expect(ctx.previousDraft).toBeUndefined();
    expect(ctx.characters).toEqual(['MAYA', 'LEO']); // the cast, then the bible entry a person wrote
    expect(ctx.suite?.things).toEqual([{ name: 'BRIEFCASE', category: 'Props' }]);
    expect(ctx.suite?.people.map((p) => `${p.name}:${p.source}`)).toEqual(['LEO:bible', 'MAYA:cast']);
    forgetReadingContext();
    scriptRow = null;
    expect(await loadReadingContext('s1')).toEqual({});
  });

  it('does not remember a failed load: the next surface to ask tries again', async () => {
    scriptRow = null;
    expect(await loadReadingContext('s1')).toEqual({});
    const reads = calls.length;
    scriptRow = { project_id: 'p1', format: 'screenplay' };
    const ctx = await loadReadingContext('s1');
    expect(calls.length).toBeGreaterThan(reads);
    expect(ctx.characters).toEqual(['MAYA', 'LEO']); // the cast, then the bible entry a person wrote
    expect(ctx.suite?.things).toEqual([{ name: 'BRIEFCASE', category: 'Props' }]);
    expect(ctx.suite?.people.map((p) => `${p.name}:${p.source}`)).toEqual(['LEO:bible', 'MAYA:cast']);
  });
});
