// The printed day out of days: each cast member against each shoot day (S start, W work, H hold, F finish, SF start and finish the same
// day), with how many days they work. Built on the print kit; landscape. Pure: the view hands over what the stripboard engine computed.
import type { PrintColumn, PrintDoc } from '@/lib/print/kit';

export interface DoodPrintInput {
  project: string;
  accent?: string | null;
  /** The shoot days in order (only days with scenes). */
  days: number[];
  rows: Array<{ name: string; cells: string[]; worked: number }>;
  generated: string;
}

export function doodDoc(i: DoodPrintInput): PrintDoc {
  const columns: PrintColumn[] = [
    { key: 'name', label: 'Cast' },
    ...i.days.map((d) => ({ key: `d${d}`, label: `D${d}`, align: 'center' as const, width: '5%' })),
    { key: 'worked', label: 'Days', align: 'right', width: '7%' },
  ];
  return {
    title: 'Day out of days',
    kind: i.project,
    accent: i.accent,
    meta: [['Cast', i.rows.length], ['Shoot days', i.days.length]],
    blocks: [
      {
        type: 'table',
        columns,
        rows: i.rows.map((r) => ({ name: r.name, ...Object.fromEntries(i.days.map((d, idx) => [`d${d}`, r.cells[idx] || null])), worked: r.worked })),
        empty: 'Nobody is scheduled yet.',
      },
      { type: 'note', text: 'S start · W work · H hold (between work days, still on the payroll) · F finish · SF start and finish on the same day.' },
    ],
    footer: i.project,
    generated: i.generated,
    orientation: 'landscape',
  };
}
