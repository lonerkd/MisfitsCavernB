import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const { PRODUCTION_REF, previewEnvProblems, assertPreviewNotProduction } = createRequire(import.meta.url)(
  '../../scripts/preview-env-guard.js',
) as {
  PRODUCTION_REF: string;
  previewEnvProblems: (env: Record<string, string | undefined>) => string[];
  assertPreviewNotProduction: (env: Record<string, string | undefined>) => void;
};

const jwt = (ref: string) =>
  `h.${Buffer.from(JSON.stringify({ ref, role: 'anon' })).toString('base64url')}.s`;

describe('preview environment guard', () => {
  it('refuses a preview whose URL is production', () => {
    const env = { VERCEL_ENV: 'preview', NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_REF}.supabase.co` };
    expect(previewEnvProblems(env)).toHaveLength(1);
    expect(() => assertPreviewNotProduction(env)).toThrow(/production/);
  });

  it('refuses a preview holding a production key even with a staging URL', () => {
    const env = {
      VERCEL_ENV: 'preview',
      NEXT_PUBLIC_SUPABASE_URL: 'https://stagingref.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt('stagingref'),
      SUPABASE_SERVICE_ROLE_KEY: jwt(PRODUCTION_REF),
    };
    expect(previewEnvProblems(env)).toEqual(['SUPABASE_SERVICE_ROLE_KEY belongs to the production project']);
  });

  it('refuses a production database URL for the drift target', () => {
    const env = { VERCEL_ENV: 'preview', DRIFT_TARGET_DB_URL: `postgresql://x@db.${PRODUCTION_REF}.supabase.co/postgres` };
    expect(previewEnvProblems(env)).toHaveLength(1);
  });

  it('allows a preview on staging', () => {
    const env = {
      VERCEL_ENV: 'preview',
      NEXT_PUBLIC_SUPABASE_URL: 'https://stagingref.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt('stagingref'),
    };
    expect(() => assertPreviewNotProduction(env)).not.toThrow();
  });

  it('leaves production and local runs alone', () => {
    const url = `https://${PRODUCTION_REF}.supabase.co`;
    expect(previewEnvProblems({ VERCEL_ENV: 'production', NEXT_PUBLIC_SUPABASE_URL: url })).toEqual([]);
    expect(previewEnvProblems({ NEXT_PUBLIC_SUPABASE_URL: url })).toEqual([]);
  });

  it('ignores a malformed key', () => {
    expect(previewEnvProblems({ VERCEL_ENV: 'preview', SUPABASE_SERVICE_ROLE_KEY: 'not-a-jwt' })).toEqual([]);
  });
});
