// ESLint 9 flat config (Next 16 removed `next lint`). Next's core-web-vitals
// rules, as before. The React Compiler rules that arrived with it (react-hooks
// v7) reported existing patterns across the app. Each is a warning only until
// the code it flags is reworked; once a rule reaches zero it goes back to an
// error so it stays there. Still warnings: the three below.
import coreWebVitals from 'eslint-config-next/core-web-vitals';

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'public/**', 'supabase/**', 'next-env.d.ts'] },
  ...coreWebVitals,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
];

export default config;
