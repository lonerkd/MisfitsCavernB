import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    include: ['lib/**/*.test.ts', 'lib/**/*.test.tsx'],
    environment: 'node',
    coverage: {
      // Scope: the unit-tested core (lib/). Pages and components are covered
      // by the Playwright journeys, which don't produce line coverage — so
      // counting them here would measure the wrong thing. Test files, types
      // and barrels are excluded because they aren't behaviour.
      provider: 'v8',
      include: ['lib/**/*.ts', 'lib/**/*.tsx'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.d.ts',
        'lib/**/index.ts',
        'lib/supabase/database.types.ts',
      ],
      reporter: ['text-summary', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
      // Enforced by CI (`npm run test:coverage` in the checks job): coverage
      // may never drop below these numbers (BACKLOG 3.16). Raise them when
      // the tests grow — never lower them to make a build pass.
      // Baselines: 2026-10-08 on main (lib/ scope) — statements 49.88, branches
      // 49.72, functions 52.29, lines 49.37. #137 moved data access into
      // lib/supabase/*, which dipped coverage to 47.96 / 47.03 / 49.81 / 47.67
      // until its unit tests (BACKLOG 3.17) were written. Re-measured 2026-10-10
      // with them: 50.48 / 50.65 / 52.58 / 50.43. Floored to whole numbers, so
      // only a real drop fails.
      thresholds: {
        statements: 50,
        branches: 50,
        functions: 52,
        lines: 50,
      },
    },
  },
});
