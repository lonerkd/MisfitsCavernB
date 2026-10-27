import { describe, it, expect } from 'vitest';
import { cardOf, type CardInput, type CardScene } from './card';
import type { Entity, Link } from './links';

const scene = (id: string, n: number, over: Partial<CardScene> = {}): CardScene => ({
  id, scene_number: n, heading: `INT. ROOM ${n} - DAY`, title: `Scene ${n}`, time_of_day: 'DAY',
  location: null, location_id: null, shoot_day: null, shoot_day_id: null, ...over,
});
const ent = (id: string, kind: Entity['kind'], label: string): Entity => ({ id, project_id: 'p', kind, label });
const link = (from: string, to: string): Link => ({ id: `${from}-${to}`, project_id: 'p', from_entity: from, to_entity: to, kind: 'about', created_by: null, created_at: '' });

const input = (over: Partial<CardInput> = {}): CardInput => ({
  entities: [ent('s1', 'scene', '1. INT. ROOM 1 - DAY'), ent('s2', 'scene', '2. INT. ROOM 2 - DAY'), ent('c1', 'character', 'MAYA'), ent('l1', 'location', 'CAVE'), ent('d1', 'shoot_day', 'Day 1'), ent('t1', 'task', 'Lock the cave'), ent('m1', 'media', 'Lantern ref')],
  links: [],
  scenes: [scene('s1', 1, { location_id: 'l1', shoot_day_id: 'd1', shoot_day: 1 }), scene('s2', 2, { location: 'cave', shoot_day: 1 })],
  characters: [{ id: 'c1', name: 'MAYA' }],
  places: [{ id: 'l1', name: 'CAVE' }],
  days: [{ id: 'd1', day_number: 1, shoot_date: '2026-11-02' }],
  castOf: () => [],
  sceneCharacters: [{ scene_id: 's1', character_id: 'c1' }],
  ...over,
});

describe('cardOf', () => {
  it('is null for something that is not an entity', () => {
    expect(cardOf('nope', input())).toBeNull();
  });

  it('a scene shows its characters, its place and its day from the graph', () => {
    const card = cardOf('s1', input())!;
    expect(card.title).toBe('1. INT. ROOM 1 - DAY');
    expect(card.connected.map((g) => [g.title, g.items.map((i) => i.label)])).toEqual([
      ['Characters', ['MAYA']], ['Location', ['CAVE']], ['Shoots on', ['Day 1']],
    ]);
  });

  it('a scene falls back to the place by name and the day by number, and says when it is not scheduled', () => {
    const card = cardOf('s2', input())!;
    expect(card.connected.find((g) => g.title === 'Location')?.items[0].id).toBe('l1');
    expect(card.connected.find((g) => g.title === 'Shoots on')?.items[0].id).toBe('d1');
    const loose = cardOf('s2', input({ scenes: [scene('s2', 2)] }))!;
    expect(loose.facts).toContainEqual({ label: 'Schedule', value: 'Not scheduled yet' });
  });

  it('a character lists its scenes in order; a location and a day list theirs', () => {
    const many = input({ sceneCharacters: [{ scene_id: 's2', character_id: 'c1' }, { scene_id: 's1', character_id: 'c1' }] });
    expect(cardOf('c1', many)!.connected[0].items.map((i) => i.id)).toEqual(['s1', 's2']);
    expect(cardOf('l1', input())!.connected[0].items.map((i) => i.id)).toEqual(['s1', 's2']);
    const day = cardOf('d1', input())!;
    expect(day.facts[0]).toEqual({ label: 'Date', value: '2026-11-02' });
    expect(day.connected[0].items.map((i) => i.id)).toEqual(['s1', 's2']);
  });

  it('attached things are grouped by kind and found from either end of the link', () => {
    const linked = input({ links: [link('t1', 's1'), link('s1', 'm1')] });
    const card = cardOf('s1', linked)!;
    expect(card.attached.map((g) => [g.title, g.items.map((i) => i.label)])).toEqual([['Tasks', ['Lock the cave']], ['Media', ['Lantern ref']]]);
    expect(cardOf('t1', linked)!.attached[0].items[0].id).toBe('s1');
  });

  it('a link to something that is gone is not shown', () => {
    expect(cardOf('s1', input({ links: [link('s1', 'ghost')] }))!.attached).toEqual([]);
  });
});
