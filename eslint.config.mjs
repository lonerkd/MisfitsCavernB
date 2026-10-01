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
      // The design scales (docs/DESIGN_DIRECTION_2026-09.md): the 11px text floor and the radius scale.
      'no-restricted-syntax': [
        "error",
        {
          "selector": "Property[key.name='fontSize'][value.type='Literal'][value.value<11]",
          "message": "Text below 11px is illegible. Use the type scale in app/globals.css (--text-2xs is the floor)."
        },
        {
          "selector": "Property[key.name='borderRadius'][value.type='Literal'][value.value>0]:not([value.value=4]):not([value.value=8]):not([value.value=14]):not([value.value=20]):not([value.value=28]):not([value.value=9999])",
          "message": "Off-scale radius. Use 4, 8, 14, 20, 28 or 9999 (--r-xs .. --r-full)."
        }
      ],
    },
  },
];
