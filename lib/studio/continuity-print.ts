// The printed continuity sheet: scenes in story order, grouped by story day, each with its story time and what each character looks like in
// it (look, wardrobe, make-up), and the look changes inside one story day that deserve a second look. Built on the print kit. Pure.
import type { PrintBlock, PrintDoc } from '@/lib/print/kit';

export interface ContinuityScene {
  number: number;
  heading: string;
  /** "Morning", "Night" ... or empty when not set. */
  time: string;
  /** Each character in the scene with the look noted for them (empty when none yet). */
  looks: Array<{ character: string; look: string }>;
}

export interface ContinuityDay { label: string; scenes: ContinuityScene[] }

export interface ContinuityPrintInput {
  project: string;
  accent?: string | null;
  days: ContinuityDay[];
  /** Look changes inside one story day, already worded. */
  warnings: string[];
  generated: string;
}

export function continuityDoc(i: ContinuityPrintInput): PrintDoc {
  const blocks: PrintBlock[] = [];
  if (i.warnings.length) blocks.push({ type: 'section', title: 'Look changes inside one story day', blocks: [{ type: 'list', items: i.warnings }] });
  for (const d of i.days) {
    blocks.push({
      type: 'section',
      title: d.label,
      blocks: [{
        type: 'table',
        columns: [{ key: 'n', label: 'Sc', width: '7%' }, { key: 'h', label: 'Scene', width: '30%' }, { key: 't', label: 'Time', width: '11%' }, { key: 'l', label: 'Looks' }],
        rows: d.scenes.map((s) => ({ n: s.number, h: s.heading, t: s.time || null, l: s.looks.map((x) => (x.look ? `${x.character}: ${x.look}` : `${x.character}: (no look noted)`)).join('\n') || null })),
      }],
    });
  }
  if (blocks.length === 0) blocks.push({ type: 'note', text: 'There are no scenes to track yet.' });
  const scenes = i.days.reduce((n, d) => n + d.scenes.length, 0);
  return {
    title: 'Continuity',
    kind: i.project,
    accent: i.accent,
    meta: [['Scenes', scenes], ['Story days', i.days.filter((d) => !/^No story day/i.test(d.label)).length || null], ['To check', i.warnings.length || null]],
    blocks,
    footer: i.project,
    generated: i.generated,
  };
}
