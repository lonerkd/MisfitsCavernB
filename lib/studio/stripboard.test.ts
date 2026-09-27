import { describe, it, expect } from 'vitest';
import { buildBoard, castOf, dayOutOfDays, pages, stripKind, type StripScene } from './stripboard';

const sc = (n: number, day: number, heading: string, tod: string, eighths: number, cast = '', location = heading.split(/\.\s*/)[1]?.split(' - ')[0] ?? null): StripScene => ({
  id: `s${n}`, scene_number: n, heading, location, time_of_day: tod, est_duration: `${eighths}/8 pg`, cast_list: cast, shoot_day: day,
});

describe('stripKind', () => {
  it('reads interior/exterior and day/night the way a strip is coloured', () => {
    expect(stripKind({ heading: 'INT. CAVE - NIGHT', location: 'CAVE', time_of_day: 'NIGHT' })).toBe('int-night');
    expect(stripKind({ heading: 'EXT. RIDGE - DAWN', location: 'RIDGE', time_of_day: 'DAWN' })).toBe('ext-day');
    expect(stripKind({ heading: '12 EXT. ROAD - DUSK', location: 'ROAD', time_of_day: null })).toBe('ext-night');
    expect(stripKind({ heading: 'INT./EXT. CAR - DAY', location: 'CAR', time_of_day: 'DAY' })).toBe('int-day');
  });
});

describe('buildBoard', () => {
  const scenes = [
    sc(1, 1, 'INT. CAVE - NIGHT', 'NIGHT', 12, 'SAM, MAYA'),
    sc(2, 1, 'EXT. RIDGE - DAY', 'DAY', 30, 'SAM'),
    sc(3, 3, 'INT. CAVE - DAY', 'DAY', 6, 'Maya'),
  ];

  it('lays out days 1…last with page totals, locations, cast and overruns', () => {
    const board = buildBoard(scenes, 40);
    expect(board.map((d) => d.day)).toEqual([1, 2, 3]);
    expect(board[0]).toMatchObject({ eighths: 42, locations: ['CAVE', 'RIDGE'], cast: ['MAYA', 'SAM'], over: true });
    expect(board[1].scenes).toEqual([]);
    expect(board[2]).toMatchObject({ eighths: 6, locations: ['CAVE'], over: false });
  });

  it('builds the day out of days: start, hold, finish, same-day start-finish', () => {
    const dood = dayOutOfDays(buildBoard(scenes, 40));
    expect(dood).toEqual([
      { name: 'MAYA', cells: ['S', 'H', 'F'], worked: 2 },
      { name: 'SAM', cells: ['SF', '', ''], worked: 1 },
    ]);
  });
});

describe('helpers', () => {
  it('writes pages the way schedules do', () => {
    expect([pages(8), pages(11), pages(7), pages(0)]).toEqual(['1', '1 3/8', '7/8', '0']);
  });
  it('splits cast lists', () => {
    expect(castOf({ cast_list: ' sam ,MAYA,, ' })).toEqual(['SAM', 'MAYA']);
    expect(castOf({ cast_list: null })).toEqual([]);
  });
});
