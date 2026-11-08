// ESLint 9 flat config (Next 16 removed `next lint`). Next's core-web-vitals
// rules, as before, including the React Compiler rules (react-hooks v7) at
// their default: errors. (They were warnings while the code they flagged was
// reworked; the patterns used are in .cavern-intelligence/conventions.md.)
import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

// The design scales (.cavern-intelligence/archive/DESIGN_DIRECTION_2026-09.md): the 11px text floor and the radius scale.
const DESIGN_SCALES = [
  {
    selector: "Property[key.name='fontSize'][value.type='Literal'][value.value<11]",
    message: 'Text below 11px is illegible. Use the type scale in app/globals.css (--text-2xs is the floor).',
  },
  {
    selector: "Property[key.name='borderRadius'][value.type='Literal'][value.value>0]:not([value.value=4]):not([value.value=8]):not([value.value=14]):not([value.value=20]):not([value.value=28]):not([value.value=9999])",
    message: 'Off-scale radius. Use 4, 8, 14, 20, 28 or 9999 (--r-xs .. --r-full).',
  },
];

// Pages and components read and write through the typed modules in
// lib/supabase (conventions.md §1). Auth, Realtime and Storage stay on the
// client; table queries and RPCs don't.
const DATA_THROUGH_LIB = {
  selector: "MemberExpression[object.name='supabase'][property.name=/^(from|rpc)$/]",
  message: 'Query tables and call RPCs through a function in lib/supabase/* (conventions.md §1), not supabase.from() / supabase.rpc() in a page or component.',
};

// One colour system (design-tokens.md): colours come from theme tokens (var(--accent), readable(...)), never a literal that
// reads on one theme and not another, and never a token name that is not defined (`var(--warning, #b45309)` used a token
// that did not exist, so the colour followed no theme). Brand marks, media frames and the theme files themselves are exempt.
const COLOUR_RULES = [
  {
    selector: "Property[key.name=/^(color|background|backgroundColor|borderColor|borderTopColor|borderBottomColor|fill|stroke|outlineColor)$/][value.type='Literal'][value.value=/^(#[0-9a-fA-F]{3,8}|rgba?\\()/]",
    message: 'A literal colour reads on one theme only. Use a token (var(--fg), var(--accent), var(--warn) ...) from app/globals.css; see design-tokens.md.',
  },
  {
    selector: "Literal[value=/var\\(--[a-z0-9-]+,\\s*(#|rgb)/]",
    message: 'A token with a hard-coded fallback hides a token that is not defined. Use a token that exists in app/globals.css (e.g. --warn, not --warning).',
  },
];

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'public/**', 'supabase/**', 'next-env.d.ts'] },
  ...coreWebVitals,
  ...typescript,
  {
    // Code that says one thing and does another is what slipped through before: `false && <Sidebar/>` (a "removed" block
    // that is still in the file), `as any` around a typed save, an import nothing uses. Existing cases are recorded in
    // eslint-suppressions.json and only ever shrink (`npm run lint:ratchet`); a new one fails the build.
    rules: {
      'no-constant-binary-expression': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': 'allow-with-description', minimumDescriptionLength: 10 }],
    },
  },
  // Tests build fixtures and reach into untyped shapes on purpose.
  { files: ['**/*.test.{ts,tsx}', 'tests/**', 'e2e/**', 'scripts/**'], rules: { '@typescript-eslint/no-explicit-any': 'off' } },
  { rules: { 'no-restricted-syntax': ['error', ...DESIGN_SCALES] } },
  {
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
    ignores: ['components/brand/**', 'components/landing/**', 'components/film/**'],
    rules: { 'no-restricted-syntax': ['error', ...DESIGN_SCALES, DATA_THROUGH_LIB, ...COLOUR_RULES] },
  },
  {
    files: ['components/brand/**/*.{ts,tsx}', 'components/landing/**/*.{ts,tsx}', 'components/film/**/*.{ts,tsx}'],
    rules: { 'no-restricted-syntax': ['error', ...DESIGN_SCALES, DATA_THROUGH_LIB] },
  },
];

export default config;
