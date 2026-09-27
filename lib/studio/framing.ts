// Film grammar for the shot designer: shot sizes, camera angles and moves.
// Like the screenplay format rules, this is the craft's vocabulary, not a
// setting — but each size is defined by what the frame sees (a window onto
// a standing figure), so the picker can draw it rather than name it.
//
// World units: a figure 180 tall, head top at y=0, feet at y=180, centred
// on x=0. A size's window is its centre and height; width is 16:9.

export interface ShotSize {
  id: string;
  label: string;
  hint: string;
  window: { cx: number; cy: number; h: number };
  /** What else is in frame. */
  extra?: 'ots' | 'pov' | 'insert' | 'two';
}

export const SHOT_SIZES: ShotSize[] = [
  { id: 'EWS', label: 'Extreme wide', hint: 'The world; the figure is small in it', window: { cx: 0, cy: 60, h: 1000 } },
  { id: 'WS', label: 'Wide', hint: 'Whole figure with room around it', window: { cx: 0, cy: 95, h: 320 } },
  { id: 'FS', label: 'Full', hint: 'Head to toe', window: { cx: 0, cy: 92, h: 210 } },
  { id: 'MS', label: 'Medium', hint: 'Waist up', window: { cx: 0, cy: 58, h: 125 } },
  { id: 'MCU', label: 'Medium close-up', hint: 'Chest up', window: { cx: 0, cy: 36, h: 78 } },
  { id: 'CU', label: 'Close-up', hint: 'The face', window: { cx: 0, cy: 19, h: 46 } },
  { id: 'ECU', label: 'Extreme close-up', hint: 'Eyes, a detail of the face', window: { cx: 0, cy: 12, h: 18 } },
  { id: 'OTS', label: 'Over the shoulder', hint: 'Past one character to another', window: { cx: 4, cy: 36, h: 90 }, extra: 'ots' },
  { id: 'POV', label: 'Point of view', hint: 'What a character sees', window: { cx: 0, cy: 95, h: 320 }, extra: 'pov' },
  { id: '2S', label: 'Two-shot', hint: 'Two people in frame', window: { cx: 0, cy: 58, h: 140 }, extra: 'two' },
  { id: 'INS', label: 'Insert', hint: 'An object or detail', window: { cx: 0, cy: 0, h: 60 }, extra: 'insert' },
];

export const ANGLES = [
  { id: 'eye', label: 'Eye level' },
  { id: 'high', label: 'High' },
  { id: 'low', label: 'Low' },
  { id: 'dutch', label: 'Dutch' },
  { id: 'overhead', label: 'Overhead' },
] as const;

export const MOVEMENTS = [
  { id: 'static', label: 'Static' },
  { id: 'pan', label: 'Pan' },
  { id: 'tilt', label: 'Tilt' },
  { id: 'dolly', label: 'Dolly' },
  { id: 'track', label: 'Track' },
  { id: 'crane', label: 'Crane' },
  { id: 'handheld', label: 'Handheld' },
  { id: 'steadicam', label: 'Steadicam' },
  { id: 'zoom', label: 'Zoom' },
] as const;

const ALIASES: Record<string, string> = {
  xws: 'EWS', els: 'EWS', ews: 'EWS', 'extreme wide': 'EWS',
  ws: 'WS', ls: 'WS', wide: 'WS', 'long shot': 'WS',
  fs: 'FS', full: 'FS',
  ms: 'MS', medium: 'MS', mid: 'MS',
  mcu: 'MCU', cu: 'CU', 'close-up': 'CU', closeup: 'CU', ecu: 'ECU', xcu: 'ECU',
  ots: 'OTS', pov: 'POV', '2s': '2S', 'two-shot': '2S', twoshot: '2S', ins: 'INS', insert: 'INS',
};

/** The size a stored value means (tolerant of case and common spellings), or null. */
export function sizeOf(value: string | null | undefined): ShotSize | null {
  if (!value) return null;
  const id = ALIASES[value.trim().toLowerCase()] ?? value.trim().toUpperCase();
  return SHOT_SIZES.find((s) => s.id === id) ?? null;
}

export const angleOf = (v: string | null | undefined) => ANGLES.find((a) => a.id === v) ?? null;
export const movementOf = (v: string | null | undefined) => MOVEMENTS.find((m) => m.id === v) ?? null;

/** The SVG viewBox a size frames, at 16:9. */
export function viewBoxFor(size: ShotSize | null): string {
  const { cx, cy, h } = (size ?? SHOT_SIZES[1]).window;
  const w = (h * 16) / 9;
  return `${round(cx - w / 2)} ${round(cy - h / 2)} ${round(w)} ${round(h)}`;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** "MCU · Low · Dolly · 35mm" — for print, exports and tooltips. */
export function describeCamera(shot: { shot_size: string | null; angle: string | null; movement: string | null; lens: string | null }): string {
  return [sizeOf(shot.shot_size)?.id ?? shot.shot_size, angleOf(shot.angle)?.label, movementOf(shot.movement)?.label, shot.lens]
    .filter((x): x is string => !!x && x.trim().length > 0)
    .join(' · ');
}
