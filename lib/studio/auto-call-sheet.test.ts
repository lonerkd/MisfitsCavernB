import { describe, it, expect } from 'vitest';
import { autoCallSheet } from './auto-call-sheet';
import { buildBoard } from './stripboard';

describe('autoCallSheet', () => {
  const scenes = [
    { id: 's1', scene_number: 1, heading: 'INT. CAVE - NIGHT', location: 'CAVE', time_of_day: 'NIGHT', est_duration: '12/8 pg', cast_list: 'SAM, MAYA', shoot_day: 1, doubtful: true },
    { id: 's2', scene_number: 2, heading: 'EXT. RIDGE - DAY', location: 'RIDGE', time_of_day: 'DAY', est_duration: '3/8 pg', cast_list: 'SAM', shoot_day: 1 },
  ];
  const board = buildBoard(scenes as any, 40);
  const sheet = autoCallSheet(board[0]);

  it('extracts day number', () => {
    expect(sheet.day).toBe(1);
  });

  it('lists scenes in order', () => {
    expect(sheet.scenes).toHaveLength(2);
    expect(sheet.scenes[0].scene_number).toBe(1);
    expect(sheet.scenes[1].scene_number).toBe(2);
  });

  it('collects cast', () => {
    expect(sheet.cast).toContain('SAM');
    expect(sheet.cast).toContain('MAYA');
  });

  it('collects locations', () => {
    expect(sheet.locations).toContain('CAVE');
    expect(sheet.locations).toContain('RIDGE');
  });

  it('tracks doubtful count', () => {
    expect(sheet.doubtful).toBe(1);
  });

  it('tracks over capacity', () => {
    expect(sheet.over).toBe(false);
  });
});