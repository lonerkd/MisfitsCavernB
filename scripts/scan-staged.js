#!/usr/bin/env node
// Refuses a commit whose staged lines carry a high-confidence credential. CI's
// gitleaks scan (secret-scan.yml) is the full check; this one runs before the
// credential ever leaves the machine and needs nothing installed.
const { execFileSync } = require('child_process');

const RULES = [
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['live API key', /\b(?:sk|rk)_live_[0-9A-Za-z]{16,}\b/],
  ['GitHub token', /\bgh[pousr]_[0-9A-Za-z]{36,}\b/],
  ['Supabase server key', /\bsb_secret_[0-9A-Za-z_-]{20,}\b/],
];

function jwtRole(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

function findings(diff) {
  const out = [];
  let file = '';
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) { file = line.slice(6); continue; }
    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    for (const [name, re] of RULES) if (re.test(line)) out.push({ file, name });
    for (const jwt of line.match(/\beyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g) ?? []) {
      const role = jwtRole(jwt);
      // anon keys are public by design; any other role (service_role…) is not.
      if (role && role !== 'anon') out.push({ file, name: `Supabase ${role} JWT` });
    }
  }
  return out;
}

if (require.main === module) {
  const diff = execFileSync('git', ['diff', '--cached', '--unified=0', '--no-color'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const hits = findings(diff);
  if (hits.length) {
    console.error('pre-commit: possible credential in the staged changes:');
    for (const h of hits) console.error(`  ${h.file}: ${h.name}`);
    console.error('Remove it — credentials live in Vercel, GitHub Actions secrets or the Supabase vault.');
    process.exit(1);
  }
}

module.exports = { findings };
