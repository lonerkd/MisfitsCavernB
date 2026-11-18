import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';

// BACKLOG 3.37: an e2e spec gets its backend from the shared `stack` fixture (e2e/support/stack.ts), never its own copy.
// A hand-rolled connection is the drift the fixture exists to end (it ignored staging, never cleaned up, and read the
// environment a different way in every file). New specs that copy the old setup fail here.
const specs = readdirSync('e2e').filter((f) => f.endsWith('.spec.ts'));

const FORBIDDEN = [
  [/npx supabase status/, "reads the stack itself (`npx supabase status`): use `stack.admin`, `stack.anonClient()`, `stack.url`, `stack.dbUrl`"],
  [/process\.env\.E2E_LOCAL_STACK/, 'reads E2E_LOCAL_STACK itself: use `stackEnabled` / `stackSkipReason` from ./support/stack'],
  [/createClient\([^)]*SERVICE_ROLE_KEY/, 'builds its own service-role client: use `stack.admin`'],
];

describe('e2e specs use the shared stack fixture', () => {
  it('finds the specs', () => {
    expect(specs.length).toBeGreaterThan(100);
  });

  for (const [pattern, why] of FORBIDDEN) {
    it(`no spec ${why.split(':')[0]}`, () => {
      const offenders = specs.filter((f) => pattern.test(readFileSync(`e2e/${f}`, 'utf8')));
      expect(offenders, `${offenders.join(', ')} ${why}`).toEqual([]);
    });
  }
});
