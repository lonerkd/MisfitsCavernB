// A stand-in for the Supabase client, mocked at its edge for unit tests of
// lib/supabase/*. Every query-builder method returns the builder; awaiting it
// (or .single() / .maybeSingle()) resolves to the result set up for its table.
// What the test asserts is the module's own logic: what it asks for and how it
// maps what comes back. RLS and SQL are covered by the persona tests.

export interface FakeResult { data?: unknown; error?: { message: string } | null; count?: number | null }
export interface FakeCall { table: string; method: string; args: unknown[] }

/** A result for a table, or a list of them used in order (the last repeats). */
export type FakeResults = Record<string, FakeResult | FakeResult[]>;

export function createFakeSupabase(results: FakeResults = {}, rpcs: Record<string, FakeResult> = {}) {
  const calls: FakeCall[] = [];
  const used: Record<string, number> = {};

  function resultFor(table: string): FakeResult {
    const r = results[table];
    if (!r) return { data: null, error: null };
    if (!Array.isArray(r)) return r;
    const i = Math.min(used[table] ?? 0, r.length - 1);
    used[table] = (used[table] ?? 0) + 1;
    return r[i];
  }

  function builder(table: string) {
    let settled: FakeResult | null = null;
    const settle = () => (settled ??= { error: null, data: null, count: null, ...resultFor(table) });
    const proxy: object = new Proxy({}, {
      get(_t, method: string) {
        if (method === 'then') {
          return (resolve: (v: FakeResult) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(settle()).then(resolve, reject);
        }
        return (...args: unknown[]) => {
          calls.push({ table, method, args });
          return proxy;
        };
      },
    });
    return proxy;
  }

  const client = {
    from: (table: string) => builder(table),
    rpc: async (name: string, args?: unknown) => {
      calls.push({ table: `rpc:${name}`, method: 'rpc', args: [args] });
      return { data: null, error: null, ...(rpcs[name] ?? {}) };
    },
  };

  return {
    client,
    calls,
    results,
    /** The arguments of every call of `method` on `table`. */
    argsOf: (table: string, method: string) => calls.filter((c) => c.table === table && c.method === method).map((c) => c.args),
  };
}

type Fake = ReturnType<typeof createFakeSupabase>;
let current: Fake | null = null;

/**
 * Sets what the mocked client returns for this test and gives back the fake
 * (to read `calls` from). Pair with, at the top of the test file:
 *   vi.mock('./client', async () => ({ supabase: (await import('@/tests/unit-support/fakeSupabase')).supabaseProxy }));
 */
export function useFake(results: FakeResults = {}, rpcs: Record<string, FakeResult> = {}): Fake {
  current = createFakeSupabase(results, rpcs);
  return current;
}

export const supabaseProxy = new Proxy({}, {
  get(_t, key: string) {
    if (!current) throw new Error('useFake() was not called before the module under test used supabase');
    return (current.client as Record<string, unknown>)[key];
  },
});
