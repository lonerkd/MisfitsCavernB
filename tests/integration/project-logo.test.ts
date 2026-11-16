import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// The project's logo link (print kit branding): only the owner sets it, only an https link is accepted.
// Sam owns, Jordan is crew (confirmed, a tier that shapes), Riley is outside.
let cast: Cast;
let projectId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Logo on the print'));
});
afterAll(async () => { await destroyCast(cast); });

const set = (who: 'sam' | 'jordan' | 'riley', logo: string | null) =>
  cast[who].client.from('projects').update({ logo_url: logo }).eq('id', projectId).select('logo_url');

const stored = async () => {
  const { data, error } = await cast.sam.client.from('projects').select('logo_url').eq('id', projectId).single();
  if (error) throw error;
  return data.logo_url;
};

describe('projects.logo_url', () => {
  it('the owner sets and clears it', async () => {
    const r = await set('sam', 'https://cdn.example.test/logo.png');
    expect(r.error).toBeNull();
    expect(r.data).toEqual([{ logo_url: 'https://cdn.example.test/logo.png' }]);
    const cleared = await set('sam', null);
    expect(cleared.error).toBeNull();
    expect(await stored()).toBeNull();
  });

  it('crew and the outsider change nothing', async () => {
    await set('sam', 'https://cdn.example.test/a.png');
    for (const who of ['jordan', 'riley'] as const) {
      const r = await set(who, 'https://evil.example.test/x.png');
      expect(r.data ?? []).toEqual([]);
    }
    expect(await stored()).toBe('https://cdn.example.test/a.png');
  });

  it('only an https link, without spaces, is accepted', async () => {
    for (const bad of ['http://cdn.example.test/a.png', 'javascript:alert(1)', 'data:image/png;base64,AAAA', 'https://a b.test/x.png', 'https://', '']) {
      const r = await set('sam', bad);
      expect(r.error?.message, bad).toMatch(/projects_logo_url_https|violates check constraint/);
    }
    expect(await stored()).toBe('https://cdn.example.test/a.png');
  });
});
