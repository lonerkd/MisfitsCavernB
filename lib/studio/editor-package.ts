// The shoot, packaged for the editor: for each scene that was shot, which take of each shot to use (the script supervisor's circled
// takes), what sound recorded and what the camera reports say, which cards are safe, and what the editor cannot use yet. Pure: the
// view supplies the records it already holds (the script supervisor's takes, camera and sound reports, the media offload log, the
// scenes and planned shots). Nothing here is invented: a scene with no record is not in the package.

import type { ScriptTake } from './lined-script';

export interface PkgScene { id: string; scene_number: number; heading?: string | null; title?: string | null }
export interface PkgShot { id: string; scene_id: string; shot_number: string; description?: string | null }
export interface PkgCamera { scene_ids?: string[]; scene?: string; shot?: string; lens?: string; camera?: string; media?: string; notes?: string }
export interface PkgSound { scene_ids?: string[]; scene?: string; take?: string; mic?: string; wildTrack?: string; roomTone?: string; notes?: string }
export interface PkgOffload { card: string; camera?: string; status: 'pending' | 'verified' | 'archived' | string }

export interface PackageInput {
  scenes: PkgScene[];
  shots: PkgShot[];
  takes: ScriptTake[];
  camera: PkgCamera[];
  sound: PkgSound[];
  offloads: PkgOffload[];
}

export interface PackageShot { shot_id: string | null; shot: string; description: string; takes: number; selected: ScriptTake | null }
export interface PackageScene {
  scene_id: string; scene_number: number; heading: string;
  shots: PackageShot[];
  takes: number;
  cameraReports: number;
  soundReports: number;
  roomTone: boolean;
  wildTrack: boolean;
  soundNotes: string[];
}
export interface EditorPackage {
  scenes: PackageScene[];
  offloads: { total: number; pending: string[]; verified: number; archived: number };
  /** What the editor cannot use yet, in the words a producer would say it. */
  attention: string[];
  /** There is something to hand over and nothing is missing. */
  ready: boolean;
}

/** Does a record belong to this scene: by its link, or (an unlinked record) by the scene number it names. */
function inScene(r: { scene_ids?: string[]; scene?: string }, scene: PkgScene): boolean {
  if (r.scene_ids && r.scene_ids.length > 0) return r.scene_ids.includes(scene.id);
  return (r.scene ?? '').split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean).includes(String(scene.scene_number));
}

const yes = (v: string | undefined) => /^(y|yes|true|done|recorded|✓)/i.test((v ?? '').trim());

export function editorPackage(i: PackageInput): EditorPackage {
  const scenes: PackageScene[] = [];
  const attention: string[] = [];
  for (const sc of [...i.scenes].sort((a, b) => a.scene_number - b.scene_number)) {
    const takes = i.takes.filter((t) => inScene(t, sc));
    const camera = i.camera.filter((r) => inScene(r, sc));
    const sound = i.sound.filter((r) => inScene(r, sc));
    if (takes.length + camera.length + sound.length === 0) continue; // not shot (or not recorded): not in the package

    const planned = i.shots.filter((x) => x.scene_id === sc.id);
    const shots: PackageShot[] = [];
    for (const sh of planned) {
      const mine = takes.filter((t) => t.shot_id === sh.id);
      if (mine.length === 0) continue;
      shots.push({ shot_id: sh.id, shot: sh.shot_number, description: (sh.description ?? '').trim(), takes: mine.length, selected: mine.find((t) => t.circle) ?? null });
    }
    const loose = takes.filter((t) => !t.shot_id || !planned.some((x) => x.id === t.shot_id));
    if (loose.length) shots.push({ shot_id: null, shot: 'No shot linked', description: '', takes: loose.length, selected: loose.find((t) => t.circle) ?? null });

    const label = `Scene ${sc.scene_number}`;
    for (const sh of shots) {
      if (!sh.selected) attention.push(`${label}, ${sh.shot_id ? `shot ${sh.shot}` : 'takes with no shot'}: ${sh.takes} take${sh.takes === 1 ? '' : 's'} logged, none selected.`);
    }
    if (takes.length > 0 && sound.length === 0) attention.push(`${label}: takes are logged but there is no sound report.`);

    scenes.push({
      scene_id: sc.id, scene_number: sc.scene_number, heading: (sc.heading || sc.title || '').trim(),
      shots, takes: takes.length, cameraReports: camera.length, soundReports: sound.length,
      roomTone: sound.some((s) => yes(s.roomTone)), wildTrack: sound.some((s) => yes(s.wildTrack)),
      soundNotes: sound.map((s) => (s.notes ?? '').trim()).filter(Boolean),
    });
  }
  const pending = i.offloads.filter((o) => o.status === 'pending').map((o) => o.card).filter(Boolean);
  if (pending.length) attention.push(`${pending.length} card${pending.length === 1 ? ' is' : 's are'} not verified yet: ${pending.join(', ')}.`);
  return {
    scenes,
    offloads: { total: i.offloads.length, pending, verified: i.offloads.filter((o) => o.status === 'verified').length, archived: i.offloads.filter((o) => o.status === 'archived').length },
    attention,
    ready: scenes.length > 0 && attention.length === 0,
  };
}
