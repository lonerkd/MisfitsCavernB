// The printed character bible: an overview of everyone who speaks, then one page for each main character with the bible fields the
// writer has filled in, their scene and line counts, who they talk to most and what the script's own checks say about them. Built on the
// print kit. Pure: the view hands over what it shows.
import type { PrintBlock, PrintDoc } from '@/lib/print/kit';

export interface BiblePrintCharacter {
  name: string;
  fullName?: string | null;
  age?: string | null;
  description?: string | null;
  backstory?: string | null;
  motivation?: string | null;
  arc?: string | null;
  notes?: string | null;
  scenes: number;
  lines: number;
  talksTo: Array<{ name: string; strength: number }>;
  warnings: string[];
}

export interface BiblePrintInput {
  project: string;
  script?: string | null;
  accent?: string | null;
  logo?: string | null;
  /** Everyone, most lines first. */
  characters: BiblePrintCharacter[];
  /** How many get a page of their own (the rest stay in the overview). */
  mainCount?: number;
  generated: string;
}

const FIELDS: Array<[keyof BiblePrintCharacter, string]> = [['description', 'Description'], ['backstory', 'Backstory'], ['motivation', 'Motivation'], ['arc', 'Arc'], ['notes', 'Notes']];

export function characterBibleDoc(i: BiblePrintInput): PrintDoc {
  const main = i.characters.slice(0, i.mainCount ?? 12);
  const blocks: PrintBlock[] = [
    {
      type: 'table',
      columns: [{ key: 'name', label: 'Character' }, { key: 'scenes', label: 'Scenes', align: 'right', width: '9%' }, { key: 'lines', label: 'Lines', align: 'right', width: '9%' }, { key: 'talks', label: 'Talks to most' }, { key: 'checks', label: 'Checks', align: 'right', width: '9%' }],
      rows: i.characters.map((c) => ({ name: c.name, scenes: c.scenes, lines: c.lines, talks: c.talksTo.map((t) => t.name).join(', ') || null, checks: c.warnings.length || null })),
      empty: 'No characters yet.',
    },
  ];
  for (const c of main) {
    const inner: PrintBlock[] = [
      { type: 'facts', items: [['Full name', c.fullName], ['Age', c.age], ['Scenes', c.scenes], ['Lines', c.lines]] },
    ];
    for (const [key, label] of FIELDS) {
      const v = c[key];
      if (typeof v === 'string' && v.trim()) inner.push({ type: 'section', title: label, blocks: [{ type: 'text', text: v.trim() }] });
    }
    if (!FIELDS.some(([k]) => typeof c[k] === 'string' && (c[k] as string).trim())) inner.push({ type: 'note', text: 'Nothing written in the bible for this character yet.' });
    if (c.talksTo.length) inner.push({ type: 'section', title: 'Talks to most', blocks: [{ type: 'list', items: c.talksTo.map((t) => `${t.name} (${t.strength})`) }] });
    if (c.warnings.length) inner.push({ type: 'section', title: 'Worth a look', blocks: [{ type: 'list', items: c.warnings }] });
    blocks.push({ type: 'pageBreak' }, { type: 'section', title: c.name, blocks: inner });
  }
  return {
    title: 'Character bible',
    kind: i.project,
    subtitle: i.script ?? undefined,
    accent: i.accent, logo: i.logo,
    meta: [['Characters', i.characters.length], ['With a page', main.length]],
    blocks,
    footer: i.project,
    generated: i.generated,
  };
}
