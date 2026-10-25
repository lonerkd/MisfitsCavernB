import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const { findings } = createRequire(import.meta.url)('../../scripts/scan-staged.js') as {
  findings: (diff: string) => { file: string; name: string }[];
};

// Fake credentials are assembled at runtime so this file never trips a scanner.
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (role: string) => ['eyJ' + b64({ alg: 'HS256' }).slice(3), b64({ role, ref: 'x' }), 'sig'].join('.');
const diff = (file: string, ...added: string[]) => [`+++ b/${file}`, ...added.map((l) => `+${l}`)].join('\n');

describe('scan-staged', () => {
  it('flags a service-role JWT and lets an anon key through', () => {
    expect(findings(diff('a.ts', `const k = '${jwt('service_role')}';`))).toEqual([{ file: 'a.ts', name: 'Supabase service_role JWT' }]);
    expect(findings(diff('a.ts', `const k = '${jwt('anon')}';`))).toEqual([]);
  });

  it('flags private keys and provider tokens', () => {
    const lines = ['-----BEGIN ' + 'PRIVATE KEY-----', 'AKIA' + 'ABCDEFGHIJKLMNOP', 'sk_' + 'live_' + 'a'.repeat(24), 'ghp_' + 'b'.repeat(36), 'sb_' + 'secret_' + 'c'.repeat(24)];
    expect(findings(diff('b.env', ...lines)).map((f) => f.name)).toEqual(['private key', 'AWS access key', 'live API key', 'GitHub token', 'Supabase server key']);
  });

  it('ignores removed lines and ordinary text', () => {
    expect(findings(['+++ b/c.ts', `-old ${jwt('service_role')}`, '+const ok = "eyJ not a token"'].join('\n'))).toEqual([]);
  });
});
