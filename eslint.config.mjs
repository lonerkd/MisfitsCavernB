// ESLint 9 flat config (Next 16 removed `next lint`). Next's core-web-vitals
// rules, as before. The React Compiler rules that arrived with it (react-hooks
// v7) report existing patterns across the app; they are warnings until that
// code is reworked, so they show up without blocking.
import coreWebVitals from 'eslint-config-next/core-web-vitals';

export default [
  { ignores: ['.next/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'public/**', 'supabase/**', 'next-env.d.ts'] },
  ...coreWebVitals,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/static-components': 'warn',
    },
  },
];
