import { defineConfig } from 'vitest/config';
import path from 'path';

// Integration tests: real Supabase (auth, PostgREST, RLS, triggers) built from
// supabase/migrations. No mocks. Run with `npm run test:integration` after
// `npx supabase start`.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    globalSetup: ['tests/integration/support/global-setup.ts'],
    // One database, shared: run files one at a time so fixtures never interleave.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
