// The printed day out of days: each cast member against each shoot day (S start, W work, H hold, F finish, SF start and finish the same
// day), with how many days they work. Built on the print kit; landscape. Pure: the view hands over what the stripboard engine computed.
import type { PrintColumn, PrintDoc } from '@/lib/print/kit';

export interface DoodPrintInput {
  project: string;
  accent?: string | null;
  logo?: string | null;
  /** The shoot days in order (only days with scenes). */
  days: number[];
  rows: Array<{ name: string; cells: string[]; worked: number }>;
  generated: string;
}

export function doodDoc(i: DoodPrintInput): PrintDoc {
  const columns: PrintColumn[] = [
    // The name column keeps a fifth of the page however many shoot days there are; the days share the rest (a fixed 5% each pushed the
    // names to a few letters a line once a shoot passed about 14 days).
    { key: 'name', label: 'Cast', width: '22%' },
    ...i.days.map((d) => ({ key: `d${d}`, label: `D${d}`, align: 'center' as const, width: `${Math.min(5, Math.floor((66 / Math.max(1, i.days.length)) * 10) / 10)}%` })),
    { key: 'worked', label: 'Days', align: 'right', width: '7%' },
  ];
  return {
    title: 'Day out of days',
    kind: i.project,
    accent: i.accent, logo: i.logo,
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
