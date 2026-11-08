import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { anonClient, createCast, destroyCast, type Cast, type Client } from './support/personas';
import { createCrewedProject } from './support/project';

// Portfolio privacy: a piece is public, unlisted (its link only) or private (its owner only). The database decides, not the token.
// Sam owns three pieces (one of each, each with a media row and a block). Jordan is crew on one of Sam's projects, Riley is an
// outsider, and anon is not signed in. None of them may read what Sam did not publish.
let cast: Cast;
const anon: Client = anonClient();
const ids: Record<'public' | 'unlisted' | 'private', { id: string; token: string }> = {} as never;

beforeAll(async () => {
  cast = await createCast();
  await createCrewedProject(cast, 'Crewed');
  for (const v of ['public', 'unlisted', 'private'] as const) {
    const p = await cast.sam.client.from('portfolio_projects').insert({ user_id: cast.sam.id, title: `Piece ${v}`, visibility: v }).select('id, share_token').single();
    if (p.error) throw p.error;
    ids[v] = { id: p.data.id, token: p.data.share_token! };
    const m = await cast.sam.client.from('portfolio_media').insert({ project_id: p.data.id, url: `https://youtu.be/${v}`, media_type: 'youtube', title: v });
    if (m.error) throw m.error;
    const b = await cast.sam.client.from('portfolio_blocks').insert({ portfolio_project_id: p.data.id, block_type: 'text', body: `block ${v}`, position: 0 });
    if (b.error) throw b.error;
  }
});
afterAll(async () => { await destroyCast(cast); });

const readers = () => [['jordan (crew)', cast.jordan.client], ['riley (outsider)', cast.riley.client], ['anon', anon]] as const;

describe('who can read a portfolio piece, its media and its blocks', () => {
  it('a new piece is private by default', async () => {
    const p = await cast.sam.client.from('portfolio_projects').insert({ user_id: cast.sam.id, title: 'Fresh' }).select('visibility').single();
    expect(p.data?.visibility).toBe('private');
  });

  it('the owner reads all three, with their media and blocks', async () => {
    const r = await cast.sam.client.from('portfolio_projects').select('id, visibility').in('id', Object.values(ids).map((x) => x.id));
    expect(r.data?.map((x) => x.visibility).sort()).toEqual(['private', 'public', 'unlisted']);
    expect((await cast.sam.client.from('portfolio_media').select('id').in('project_id', Object.values(ids).map((x) => x.id))).data).toHaveLength(3);
    expect((await cast.sam.client.from('portfolio_blocks').select('id').in('portfolio_project_id', Object.values(ids).map((x) => x.id))).data).toHaveLength(3);
  });

  for (const [who] of [['jordan (crew)'], ['riley (outsider)'], ['anon']]) {
    it(`${who} reads only the public piece, and only its media and blocks: not the unlisted or private ones, even by id`, async () => {
      const client = readers().find(([n]) => n === who)![1];
      const all = Object.values(ids).map((x) => x.id);
      const pieces = await client.from('portfolio_projects').select('id, title').in('id', all);
      expect(pieces.error).toBeNull();
      expect(pieces.data?.map((x) => x.title)).toEqual(['Piece public']);
      const media = await client.from('portfolio_media').select('title').in('project_id', all);
      expect(media.data?.map((x) => x.title)).toEqual(['public']);
      const blocks = await client.from('portfolio_blocks').select('body').in('portfolio_project_id', all);
      expect(blocks.data?.map((x) => x.body)).toEqual(['block public']);
      // Listing everything finds no unlisted or private piece, and so no share token to use.
      const everything = await client.from('portfolio_projects').select('share_token').eq('user_id', cast.sam.id);
      expect(everything.data?.map((x) => x.share_token)).not.toContain(ids.unlisted.token);
      expect(everything.data?.map((x) => x.share_token)).not.toContain(ids.private.token);
    });
  }

  it('nobody but the owner can change a piece’s visibility', async () => {
    for (const [, client] of readers()) {
      const r = await client.from('portfolio_projects').update({ visibility: 'public' }).eq('id', ids.private.id).select('id');
      expect(r.data ?? []).toEqual([]);
    }
    const still = await cast.sam.client.from('portfolio_projects').select('visibility').eq('id', ids.private.id).single();
    expect(still.data?.visibility).toBe('private');
  });

  it('only three states are allowed', async () => {
    const r = await cast.sam.client.from('portfolio_projects').update({ visibility: 'friends' }).eq('id', ids.private.id);
    expect(r.error?.code).toBe('23514');
  });
});

describe('a piece by its share link', () => {
  const byToken = (client: Client, token: string) => client.rpc('get_shared_portfolio', { p_token: token });

  it('opens for a public piece and an unlisted one, for anyone, with its media, blocks and author', async () => {
    for (const [, client] of readers()) {
      for (const v of ['public', 'unlisted'] as const) {
        const r = await byToken(client, ids[v].token);
        expect(r.error).toBeNull();
        const d = r.data as unknown as { title: string; portfolio_media: { title: string }[]; portfolio_blocks: { body: string }[]; profiles: { username: string } };
        expect(d.title).toBe(`Piece ${v}`);
        expect(d.portfolio_media.map((m) => m.title)).toEqual([v]);
        expect(d.portfolio_blocks.map((b) => b.body)).toEqual([`block ${v}`]);
        expect(d.profiles.username).toBe(cast.sam.username);
      }
    }
  });

  it('is nothing for a private piece (even to its own link), an unknown token, an empty one', async () => {
    for (const [, client] of readers()) {
      expect((await byToken(client, ids.private.token)).data).toBeNull();
      expect((await byToken(client, 'not-a-token')).data).toBeNull();
      expect((await byToken(client, '')).data).toBeNull();
    }
  });

  it('closes again when the owner makes it private', async () => {
    await cast.sam.client.from('portfolio_projects').update({ visibility: 'private' }).eq('id', ids.unlisted.id);
    expect((await byToken(anon, ids.unlisted.token)).data).toBeNull();
    await cast.sam.client.from('portfolio_projects').update({ visibility: 'unlisted' }).eq('id', ids.unlisted.id);
    expect((await byToken(anon, ids.unlisted.token)).data).not.toBeNull();
  });
});

describe('the functions that list pieces', () => {
  it('get_recent_work lists public pieces only', async () => {
    const r = await anon.rpc('get_recent_work', { p_limit: 24 });
    const titles = (r.data ?? []).map((x: { title: string }) => x.title);
    expect(titles).toContain('Piece public');
    expect(titles).not.toContain('Piece unlisted');
    expect(titles).not.toContain('Piece private');
  });
});
