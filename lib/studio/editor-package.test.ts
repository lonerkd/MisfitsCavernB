import { describe, it, expect } from 'vitest';
import { editorPackage, type PackageInput } from './editor-package';
import type { ScriptTake } from './lined-script';

const take = (id: string, extra: Partial<ScriptTake> = {}): ScriptTake => ({ id, take: id, circle: false, scene_ids: ['s1'], ...extra });
const base = (extra: Partial<PackageInput> = {}): PackageInput => ({
  scenes: [{ id: 's2', scene_number: 2, heading: 'EXT. ROOF - NIGHT' }, { id: 's1', scene_number: 1, heading: 'INT. KITCHEN - DAY' }, { id: 's3', scene_number: 3, heading: 'INT. HALL' }],
  shots: [{ id: 'a', scene_id: 's1', shot_number: '1A', description: 'Wide' }, { id: 'b', scene_id: 's1', shot_number: '1B' }],
  takes: [take('1', { shot_id: 'a', circle: true, slate: 'A-1' }), take('2', { shot_id: 'a' }), take('3', { shot_id: 'b', circle: true })],
  camera: [{ scene_ids: ['s1'], shot: '1A', camera: 'A' }],
  sound: [{ scene_ids: ['s1'], roomTone: 'yes', wildTrack: 'no', notes: 'Fridge hum on take 2' }],
  offloads: [{ card: 'A001', status: 'verified' }, { card: 'A002', status: 'archived' }],
  ...extra,
});

describe('editorPackage', () => {
  it('lists only the scenes that were shot, in order, with the selected take of each shot, and is ready when nothing is missing', () => {
    const p = editorPackage(base());
    expect(p.scenes.map((s) => s.scene_number)).toEqual([1]);
    expect(p.scenes[0].shots.map((s) => [s.shot, s.takes, s.selected?.id])).toEqual([['1A', 2, '1'], ['1B', 1, '3']]);
    expect(p.scenes[0]).toMatchObject({ cameraReports: 1, soundReports: 1, roomTone: true, wildTrack: false, soundNotes: ['Fridge hum on take 2'] });
    expect(p.offloads).toMatchObject({ total: 2, verified: 1, archived: 1, pending: [] });
    expect(p.attention).toEqual([]);
    expect(p.ready).toBe(true);
  });

  it('says what the editor cannot use: a shot with takes and none selected, no sound report, and cards not yet verified', () => {
    const p = editorPackage(base({
      takes: [take('1', { shot_id: 'a' }), take('2', { shot_id: 'a' }), take('4', { scene_ids: ['s2'], circle: true })],
      sound: [],
      offloads: [{ card: 'A001', status: 'pending' }, { card: 'A002', status: 'pending' }, { card: 'A003', status: 'verified' }],
    }));
    // Scene 2's one take is circled (no shot linked), so only its missing sound report is named.
    expect(p.attention).toEqual([
      'Scene 1, shot 1A: 2 takes logged, none selected.',
      'Scene 1: takes are logged but there is no sound report.',
      'Scene 2: takes are logged but there is no sound report.',
      '2 cards are not verified yet: A001, A002.',
    ]);
    expect(p.ready).toBe(false);
  });

  it('files a take with no shot (or a shot that is not planned) under "No shot linked", and matches an unlinked record by the scene number it names', () => {
    const p = editorPackage(base({
      takes: [take('9', { shot_id: null, circle: true }), take('10', { scene_ids: [], scene: '1, 3', circle: true, shot_id: 'gone' })],
      camera: [{ scene: '3', camera: 'B' }], sound: [{ scene: '1', notes: 'Wild line' }],
    }));
    const one = p.scenes.find((s) => s.scene_number === 1)!;
    expect(one.shots.map((s) => [s.shot, s.takes, s.selected?.id])).toEqual([['No shot linked', 2, '9']]);
    expect(p.scenes.map((s) => s.scene_number)).toEqual([1, 3]);
    expect(p.scenes[1].cameraReports).toBe(1);
  });

  it('is not ready, and says nothing is missing, when nothing was shot', () => {
    const p = editorPackage(base({ takes: [], camera: [], sound: [], offloads: [] }));
    expect(p.scenes).toEqual([]);
    expect(p.attention).toEqual([]);
    expect(p.ready).toBe(false);
  });
});
