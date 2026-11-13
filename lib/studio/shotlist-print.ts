// The printed shot list: every shot in shooting order with its scene, size, angle, movement, lens and what it shows, and whether it is
// planned, shot or dropped. Built on the print kit; landscape. Pure: the view hands over the list it is showing (filters applied).
import type { PrintDoc } from '@/lib/print/kit';

export interface ShotPrintRow {
  scene: number | string;
  number: string;
  size: string | null;
  angle: string | null;
  movement: string | null;
  lens: string | null;
  description: string | null;
  status: string;
}

export interface ShotListPrintInput {
  project: string;
  accent?: string | null;
  shots: ShotPrintRow[];
  /** What the view's filters were, so a partial list says so ("Status: planned"). */
  filter: string | null;
  generated: string;
}

export function shotListDoc(i: ShotListPrintInput): PrintDoc {
  const got = i.shots.filter((s) => s.status === 'shot').length;
  return {
    title: 'Shot list',
    kind: i.project,
    accent: i.accent,
    meta: [['Shots', i.shots.length], ['Shot', i.shots.length ? `${got} of ${i.shots.length}` : null], ['Showing', i.filter]],
    blocks: [{
      type: 'table',
      columns: [{ key: 'scene', label: 'Sc', width: '6%' }, { key: 'number', label: 'Shot', width: '7%' }, { key: 'size', label: 'Size', width: '9%' }, { key: 'angle', label: 'Angle', width: '10%' }, { key: 'movement', label: 'Move', width: '9%' }, { key: 'lens', label: 'Lens', width: '8%' }, { key: 'description', label: 'Description' }, { key: 'status', label: 'Status', width: '9%' }],
      rows: i.shots.map((s) => ({ scene: s.scene, number: s.number, size: s.size, angle: s.angle, movement: s.movement && s.movement !== 'static' ? s.movement : null, lens: s.lens, description: s.description, status: s.status })),
      empty: 'No shots on the list.',
    }],
    footer: i.project,
    generated: i.generated,
    orientation: 'landscape',
  };
}
