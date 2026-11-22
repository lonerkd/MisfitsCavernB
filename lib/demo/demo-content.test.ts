import { describe, expect, it } from 'vitest';
import { PERSONAS, PROJECTS } from '../../scripts/demo/all';

// The demo world (scripts/demo): the content is fixture data, but a wrong reference in it only shows when the SQL is run against a database.
// These check what can be checked without one; `npm run demo:validate` checks crafts, brief answers and departments against the database.
const FORMATS = ['Advertising', 'Blog / Newsletter', 'Commercial', 'Copywriting', 'Documentary', 'Feature', 'Limited Series', 'Music Video', 'Other', 'Podcast', 'Series', 'Short Film', 'Video Game', 'Web Series', 'YouTube'];
const SETS = ['base', 'more', 'thekid'];

/** Every string value under a `who` key, anywhere in a project. */
function whoValues(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((n) => whoValues(n, out));
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) { if (k === 'who' && typeof v === 'string') out.push(v); else whoValues(v, out); }
  return out;
}

describe('the demo world content', () => {
  it('has unique persona keys and usernames, and unique project keys', () => {
    expect(new Set(PERSONAS.map((p) => p.key)).size).toBe(PERSONAS.length);
    expect(new Set(PERSONAS.map((p) => p.username)).size).toBe(PERSONAS.length);
    expect(new Set(PROJECTS.map((p) => p.key)).size).toBe(PROJECTS.length);
  });

  it('every sample person is marked as one: a username that is a person, a bio that says so', () => {
    for (const p of PERSONAS) {
      expect(p.username, p.key).toMatch(/^[a-z0-9_]+$/);
      expect(p.bio, p.key).toMatch(/Sample (crew|cast) for the demo\.$/);
    }
  });

  it('every project is in a known set, a real format and a real stage, and each set has projects', () => {
    for (const p of PROJECTS) {
      expect(SETS, `${p.key} set`).toContain(p.set ?? 'base');
      expect(FORMATS, `${p.key} format`).toContain(p.format);
      expect(['concept', 'pre-production', 'production', 'post-production', 'completed'], `${p.key} status`).toContain(p.status);
    }
    for (const s of SETS) expect(PROJECTS.filter((p) => (p.set ?? 'base') === s).length, s).toBeGreaterThan(0);
  });

  it('every person a project refers to exists: the account itself (me) or a sample person', () => {
    const keys = new Set(['me', ...PERSONAS.map((p) => p.key)]);
    for (const p of PROJECTS) {
      for (const w of whoValues(p)) expect(keys.has(w), `${p.key}: unknown person "${w}"`).toBe(true);
      expect(keys.has(p.owner), `${p.key}: unknown owner "${p.owner}"`).toBe(true);
    }
  });

  it('a call-sheet row is a crew call (a person and a role) or a cast call (a character), never both', () => {
    for (const p of PROJECTS) for (const d of p.schedule ?? []) for (const c of d.calls ?? []) {
      expect(Boolean(c.who) !== Boolean(c.character), `${p.key}: a call row with ${c.who ? 'both' : 'neither'} a person and a character`).toBe(true);
    }
  });

  it('the extra sets show what the base cast does not: other formats, every stage, an archived project, one the account only crews, an open-ended unlocked one', () => {
    const more = PROJECTS.filter((p) => p.set === 'more');
    expect(new Set(more.map((p) => p.format)).size).toBeGreaterThanOrEqual(7);
    expect(more.some((p) => p.archived)).toBe(true);
    expect(more.some((p) => p.unlockAll)).toBe(true);
    expect(more.some((p) => p.owner !== 'me' && (p.crew ?? []).some((c) => c.who === 'me'))).toBe(true);
    const thekid = PROJECTS.filter((p) => p.set === 'thekid');
    expect(thekid.some((p) => p.owner !== 'me' && (p.crew ?? []).some((c) => c.who === 'me'))).toBe(true);
  });
});
