import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';

// A portfolio piece's cover image: Sam sets it on his own piece; it must be an https link; nobody else can change it.
let cast: Cast;
let pieceId: string;

beforeAll(async () => {
  cast = await createCast();
  const p = await cast.sam.client.from('portfolio_projects').insert({ user_id: cast.sam.id, title: 'Night Shift' }).select('id').single();
  if (p.error) throw p.error;
  pieceId = p.data.id;
});
afterAll(async () => { await destroyCast(cast); });

const setCover = (who: 'sam' | 'jordan' | 'riley', cover_url: string | null) =>
  cast[who].client.from('portfolio_projects').update({ cover_url }).eq('id', pieceId).select('id, cover_url');

describe('a portfolio piece’s cover', () => {
  it('the owner sets it, and clears it', async () => {
    const r = await setCover('sam', 'https://images.example.com/still.jpg');
    expect(r.error).toBeNull();
    expect(r.data).toEqual([{ id: pieceId, cover_url: 'https://images.example.com/still.jpg' }]);
    expect((await setCover('sam', null)).data?.[0].cover_url).toBeNull();
  });

  it('is an https link: http, scripts, data links and spaces are refused by the database', async () => {
    for (const bad of ['http://images.example.com/a.jpg', 'javascript:alert(1)', 'data:image/png;base64,AAAA', 'https://x.example/a b.jpg', 'https://x.example/' + 'a'.repeat(2000)]) {
      expect((await setCover('sam', bad)).error?.code, bad.slice(0, 40)).toBe('23514');
    }
  });

  it('nobody else can change it: crew and an outsider change nothing', async () => {
    await setCover('sam', 'https://images.example.com/mine.jpg');
    for (const who of ['jordan', 'riley'] as const) {
      const r = await setCover(who, 'https://images.example.com/theirs.jpg');
      expect(r.data ?? []).toEqual([]);
    }
    const now = await cast.sam.client.from('portfolio_projects').select('cover_url').eq('id', pieceId).single();
    expect(now.data?.cover_url).toBe('https://images.example.com/mine.jpg');
  });
});
