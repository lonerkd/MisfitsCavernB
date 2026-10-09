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
      // Baselines set from the 2026-10-08 run on main (lib/ scope):
      // statements 49.88, branches 49.72, functions 52.29, lines 49.37 —
      // floored to whole numbers, so only a real drop fails the build.
      thresholds: {
        statements: 49,
        branches: 49,
        functions: 51,
        lines: 49,
      },
    },
  },
});
