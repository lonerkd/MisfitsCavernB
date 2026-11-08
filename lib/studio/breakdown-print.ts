// The printed breakdown sheets: one page per scene, the scene's facts on top and what it needs below, by category (cast, props,
// wardrobe, vehicles ...). Built on the print kit. Pure: the view hands over what is tagged to each scene.
import type { PrintBlock, PrintDoc } from '@/lib/print/kit';

export interface BreakdownSheetScene {
  number: number;
  heading: string;
  /** "INT · DAY" and so on. */
  kind: string;
  pages: string;
  day: number;
  /** One entry per category that has anything: the category's label and the names tagged to the scene. */
  boxes: Array<{ label: string; names: string[] }>;
}

export interface BreakdownPrintInput {
  project: string;
  accent?: string | null;
  scenes: BreakdownSheetScene[];
  generated: string;
}

export function breakdownDoc(i: BreakdownPrintInput): PrintDoc {
  const blocks: PrintBlock[] = [];
  i.scenes.forEach((sc, idx) => {
    if (idx > 0) blocks.push({ type: 'pageBreak' });
    blocks.push({
      type: 'section',
      title: `Scene ${sc.number} · ${sc.heading || 'Untitled'}`,
      blocks: [
        { type: 'facts', items: [['Set', sc.kind], ['Pages', `${sc.pages} pp`], ['Shoot day', sc.day]] },
        sc.boxes.length
          ? { type: 'table', columns: [{ key: 'label', label: 'Needs', width: '24%' }, { key: 'names', label: 'Elements' }], rows: sc.boxes.map((b) => ({ label: b.label, names: b.names.join(', ') })) }
          : { type: 'note', text: 'Nothing is tagged to this scene yet.' },
      ],
    });
  });
  if (i.scenes.length === 0) blocks.push({ type: 'note', text: 'There are no scenes to break down yet.' });
  return {
    title: 'Breakdown sheets',
    kind: i.project,
    accent: i.accent,
    meta: [['Scenes', i.scenes.length]],
    blocks,
    footer: i.project,
    generated: i.generated,
  };
}
