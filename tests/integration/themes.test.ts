import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';

// The theme follows the account (ui_prefs.theme): a preset by id, System, or
// custom colours — checked strictly, and private to its owner.
let cast: Cast;
beforeAll(async () => { cast = await createCast(); });
afterAll(async () => { await destroyCast(cast); });

const set = (theme: unknown) => cast.sam.client.rpc('set_my_ui_prefs', { p_patch: { theme } as never });

describe('ui_prefs.theme', () => {
  it('keeps a preset, System, or custom colours', async () => {
    expect((await set({ id: 'paper' })).error).toBeNull();
    expect((await cast.sam.client.rpc('get_my_ui_prefs')).data).toMatchObject({ theme: { id: 'paper' } });
    expect((await set({ id: 'system' })).error).toBeNull();
    expect((await set({ id: 'custom', bg: '#F0F0F0', accent: '#0b7a78' })).error).toBeNull();
    expect((await cast.sam.client.rpc('get_my_ui_prefs')).data).toMatchObject({ theme: { id: 'custom', bg: '#F0F0F0', accent: '#0b7a78' } });
  });

  it('refuses anything else', async () => {
    for (const bad of [
      'paper', { id: 'Paper!' }, { id: 'x' }, { id: 1 }, { id: 'paper', bg: '#ffffff' },
      { id: 'custom', bg: '#fff', accent: '#000000' }, { id: 'custom', bg: '#ffffff' }, { id: 'custom', bg: 'red', accent: 'blue' },
      { id: 'paper', css: 'body{}' },
    ]) {
      expect((await set(bad)).error, JSON.stringify(bad)).not.toBeNull();
    }
  });

  it('is its owner’s alone', async () => {
    await cast.jordan.client.rpc('set_my_ui_prefs', { p_patch: { theme: { id: 'terminal' } } as never });
    expect((await cast.sam.client.rpc('get_my_ui_prefs')).data).not.toMatchObject({ theme: { id: 'terminal' } });
    expect((await cast.jordan.client.rpc('get_my_ui_prefs')).data).toMatchObject({ theme: { id: 'terminal' } });
  });
});
