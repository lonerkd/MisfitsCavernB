import { describe, it, expect } from 'vitest';
import { circleTake, coverage, selectedTakes, takeSpan, type ScriptTake } from './lined-script';

const take = (id: string, extra: Partial<ScriptTake> = {}): ScriptTake => ({ id, take: id, circle: false, scene_ids: ['sc1'], ...extra });

describe('takeSpan', () => {
  it('is the lined run, clamped to the scene, and tolerant of a single line and of a reversed run', () => {
    expect(takeSpan({ from_line: 2, to_line: 5 }, 10)).toEqual({ from: 2, to: 5 });
    expect(takeSpan({ from_line: 4 }, 10)).toEqual({ from: 4, to: 4 });
    expect(takeSpan({ from_line: 5, to_line: 2 }, 10)).toEqual({ from: 2, to: 5 });
    expect(takeSpan({ from_line: 8, to_line: 40 }, 10)).toEqual({ from: 8, to: 10 });
  });
  it('is null with no run, a line before the first, or a run past the end of the scene', () => {
    expect(takeSpan({}, 10)).toBeNull();
    expect(takeSpan({ from_line: 0 }, 10)).toBeNull();
    expect(takeSpan({ from_line: 11, to_line: 12 }, 10)).toBeNull();
    expect(takeSpan({ from_line: 1 }, 0)).toBeNull();
  });
});

describe('coverage', () => {
  it('names the takes on each line and the runs no selected take covers', () => {
    const takes = [take('A', { from_line: 1, to_line: 4, circle: true }), take('B', { from_line: 3, to_line: 8 }), take('C', { from_line: 9, to_line: 9, circle: true })];
    const c = coverage(10, takes);
    expect(c.byLine[2]).toEqual(['A', 'B']);
    expect(c.byLine[9]).toEqual([]);
    expect(c.uncovered).toEqual([{ from: 5, to: 8 }, { from: 10, to: 10 }]);
    expect(c.covered).toBe(5);
  });
  it('treats every line as uncovered when no take is selected or none is lined', () => {
    expect(coverage(3, [take('A', { from_line: 1, to_line: 3 })]).uncovered).toEqual([{ from: 1, to: 3 }]);
    expect(coverage(3, []).uncovered).toEqual([{ from: 1, to: 3 }]);
    expect(coverage(0, []).uncovered).toEqual([]);
  });
});

describe('circleTake', () => {
  it('selects one take per shot of a scene, and leaves other shots and other scenes alone', () => {
    const items = [take('1', { shot_id: 'x', circle: true }), take('2', { shot_id: 'x' }), take('3', { shot_id: 'y', circle: true }), take('4', { shot_id: 'x', scene_ids: ['sc2'], circle: true })];
    const next = circleTake(items, '2');
    expect(next.map((i) => [i.id, i.circle])).toEqual([['1', false], ['2', true], ['3', true], ['4', true]]);
  });
  it('un-circles a circled take, and circles freely when no shot is linked', () => {
    const items = [take('1', { circle: true }), take('2')];
    expect(circleTake(items, '1').map((i) => i.circle)).toEqual([false, false]);
    expect(circleTake(items, '2').map((i) => i.circle)).toEqual([true, true]);
  });
  it('does nothing for an unknown id', () => {
    const items = [take('1')];
    expect(circleTake(items, 'zz')).toBe(items);
  });
});

describe('selectedTakes', () => {
  const scenes = new Map([['sc1', { scene_number: 3, title: 'Kitchen' }], ['sc2', { scene_number: 1, title: 'Roof' }]]);
  const name = (id: string) => ({ x: '3A', y: '3B' } as Record<string, string>)[id] ?? null;
  it('lists the circled takes by scene in order and shot, and shows a shot with none circled as a gap', () => {
    const items = [
      take('1', { shot_id: 'x', circle: true }), take('2', { shot_id: 'x' }), take('3', { shot_id: 'y' }),
      take('4', { scene_ids: ['sc2'], circle: true }), take('5', { scene_ids: [], scene: '9', circle: true }),
    ];
    const g = selectedTakes(items, scenes, name);
    expect(g.map((x) => x.scene)).toEqual(['1', '3', '9']);
    expect(g[1].shots.map((s) => [s.shot, s.takes.map((t) => t.id)])).toEqual([['3A', ['1']], ['3B', []]]);
    expect(g[0].shots[0]).toMatchObject({ shot: 'No shot linked' });
  });
});
