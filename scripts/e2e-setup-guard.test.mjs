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
  [/auth\.admin\.createUser/, 'creates users itself (`auth.admin.createUser`): use `stack.createUser` (QA-marked, removed at teardown)'],
  [/(?<![\w.])createClient\(/, 'builds its own Supabase client: use `stack.admin` or `stack.anonClient()`'],
];

// An account made on purpose through the sign-up form (auth-journey runs against whatever URL it is pointed at, production by choice) is the one exception.
const EXEMPT = new Set(['auth-journey.spec.ts']);

describe('e2e specs use the shared stack fixture', () => {
  it('finds the specs', () => {
    expect(specs.length).toBeGreaterThan(100);
  });

  it('an email a spec chooses for itself is a QA address, never a real-looking one', () => {
    const offenders = specs.filter((f) => !EXEMPT.has(f) && /createUser\(\{[^}]*email:\s*[`'"][^`'"]*@(?!journey\.test)/.test(readFileSync(`e2e/${f}`, 'utf8')));
    expect(offenders).toEqual([]);
  });

  for (const [pattern, why] of FORBIDDEN) {
    it(`no spec ${why.split(':')[0]}`, () => {
      const offenders = specs.filter((f) => !EXEMPT.has(f) && pattern.test(readFileSync(`e2e/${f}`, 'utf8')));
      expect(offenders, `${offenders.join(', ')} ${why}`).toEqual([]);
    });
  }
});
