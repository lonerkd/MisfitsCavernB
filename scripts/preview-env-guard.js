// Refuses a Vercel preview that is pointed at the production Supabase project.
// Required from next.config.js, so it runs at build and at server start.
// Tested in lib/env/previewGuard.test.ts. See adr/0006-staging-environment.md.
const PRODUCTION_REF = 'fxsryglwpwcqkfjljbrm';

// The "ref" claim of a Supabase key (a JWT) names the project it belongs to.
function keyRef(key) {
  try {
    const payload = JSON.parse(Buffer.from(String(key).split('.')[1], 'base64url').toString('utf8'));
    return typeof payload.ref === 'string' ? payload.ref : null;
  } catch {
    return null;
  }
}

// Returns the problems found (empty = fine). Only VERCEL_ENV=preview is checked.
function previewEnvProblems(env) {
  if (env.VERCEL_ENV !== 'preview') return [];
  const problems = [];
  if ((env.NEXT_PUBLIC_SUPABASE_URL || '').includes(PRODUCTION_REF)) {
    problems.push('NEXT_PUBLIC_SUPABASE_URL is the production project');
  }
  for (const name of ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (keyRef(env[name]) === PRODUCTION_REF) problems.push(`${name} belongs to the production project`);
  }
  if ((env.DRIFT_TARGET_DB_URL || '').includes(PRODUCTION_REF)) {
    problems.push('DRIFT_TARGET_DB_URL is the production database');
  }
  return problems;
}

function assertPreviewNotProduction(env) {
  const problems = previewEnvProblems(env);
  if (problems.length) {
    throw new Error(
      `Refusing to start a Vercel preview against production: ${problems.join('; ')}. ` +
        'Point the Preview environment at the staging project (adr/0006-staging-environment.md).',
    );
  }
}

module.exports = { PRODUCTION_REF, previewEnvProblems, assertPreviewNotProduction };
