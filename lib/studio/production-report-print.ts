// The printed daily production report (DPR): what was shot, how many pages, when the day started and wrapped. Built on the print
// kit. Pure: the view hands over plain facts, so the same day prints the same page.
import type { PrintDoc } from '@/lib/print/kit';

export interface ProductionReportInput {
  project: string;
  accent?: string | null;
  day: number;
  date: string | null;
  /** Clock times from the set log ("06:42"), or empty when none was logged. */
  call: string;
  wrap: string;
  scenes: Array<{ number: number; heading: string; status: string }>;
  /** Scenes that were shot or wrapped. */
  scenesDone: number;
  /** Pages shot, as eighths of a page. */
  eighths: number;
  shots: Array<{ number: string | number; scene: string | number; size: string | null; status: string }>;
  shotsGot: number;
  notes: string | null;
  generated: string;
}

export const pagesFromEighths = (n: number): string => (n / 8).toFixed(1);

export function productionReportDoc(i: ProductionReportInput): PrintDoc {
  return {
    title: `Day ${i.day}${i.date ? ` · ${i.date}` : ''}`,
    kind: 'Production report',
    subtitle: i.project,
    accent: i.accent,
    meta: [
      ['General call', i.call], ['Wrap', i.wrap],
      ['Scenes shot', `${i.scenesDone} of ${i.scenes.length}`],
      ['Pages', i.eighths ? `${pagesFromEighths(i.eighths)} pp` : null],
      ['Shots', i.shots.length ? `${i.shotsGot} of ${i.shots.length} got` : null],
    ],
    blocks: [
      {
        type: 'section', title: 'Scenes',
        blocks: [{ type: 'table', columns: [{ key: 'n', label: 'Sc', width: '10%' }, { key: 'h', label: 'Heading' }, { key: 's', label: 'Status', width: '18%' }], rows: i.scenes.map((s) => ({ n: s.number, h: s.heading, s: s.status })), empty: 'Nothing was scheduled this day.' }],
      },
      {
        type: 'section', title: 'Shots',
        blocks: [{ type: 'table', columns: [{ key: 'n', label: '#', width: '10%' }, { key: 'sc', label: 'Scene', width: '14%' }, { key: 'size', label: 'Size' }, { key: 'st', label: 'Status', width: '18%' }], rows: i.shots.map((s) => ({ n: s.number, sc: s.scene, size: s.size, st: s.status })), empty: 'No shots on the list for this day.' }],
      },
      ...(i.notes?.trim() ? [{ type: 'section' as const, title: 'Notes', blocks: [{ type: 'text' as const, text: i.notes.trim() }] }] : []),
    ],
    footer: i.project,
    generated: i.generated,
  };
}
