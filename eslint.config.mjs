// ESLint 9 flat config (Next 16 removed `next lint`). Next's core-web-vitals
// rules, as before, including the React Compiler rules (react-hooks v7) at
// their default: errors. (They were warnings while the code they flagged was
// reworked; the patterns used are in .cavern-intelligence/conventions.md.)
import coreWebVitals from 'eslint-config-next/core-web-vitals';

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'public/**', 'supabase/**', 'next-env.d.ts'] },
  ...coreWebVitals,
  {
    rules: {
      // The design scales (.cavern-intelligence/archive/DESIGN_DIRECTION_2026-09.md): the 11px text floor and the radius scale.
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

export default config;
