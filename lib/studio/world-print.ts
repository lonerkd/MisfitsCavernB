// The printed world bible: an overview table of every place, then one section for each with its record (address, contact, status, permit,
// cost, notes), where it appears in the script (scene, story day, shoot day, pages) and what the production's own checks say about it.
// Built on the print kit. Pure: the view hands over what it shows.
import type { PrintBlock, PrintDoc } from '@/lib/print/kit';

export interface WorldPrintAppearance {
  number: number;
  heading: string;
  intExt: string | null;
  time: string | null;
  storyDay: number | null;
  shootDay: number | null;
  shootDate: string | null;
  pages: string | null;
}

export interface WorldPrintLocation {
  name: string;
  address: string | null;
  contact: string | null;
  status: string;
  permit: string;
  cost: number | null;
  notes: string | null;
  appearances: WorldPrintAppearance[];
  days: number[];
  pages: string | null;
  warnings: string[];
}

export interface WorldPrintInput {
  project: string;
  accent?: string | null;
  logo?: string | null;
  locations: WorldPrintLocation[];
  format: (n: number) => string;
  generated: string;
}

const list = (ns: number[]) => ns.join(', ');

export function worldBibleDoc(i: WorldPrintInput): PrintDoc {
  const inScript = i.locations.filter((l) => l.appearances.length > 0).length;
  const checks = i.locations.reduce((n, l) => n + l.warnings.length, 0);
  const blocks: PrintBlock[] = [
    {
      type: 'table',
      columns: [
        { key: 'name', label: 'Location' }, { key: 'status', label: 'Status', width: '12%' }, { key: 'permit', label: 'Permit', width: '15%' },
        { key: 'scenes', label: 'Scenes', align: 'right', width: '8%' }, { key: 'days', label: 'Shoot days', width: '14%' }, { key: 'checks', label: 'Checks', align: 'right', width: '8%' },
      ],
      rows: i.locations.map((l) => ({
        name: l.name, status: l.status, permit: l.permit, scenes: l.appearances.length || 'not in the script yet',
        days: l.days.length ? list(l.days) : null, checks: l.warnings.length || null,
      })),
      empty: 'No locations yet.',
    },
  ];
  for (const l of i.locations) {
    const inner: PrintBlock[] = [
      { type: 'facts', items: [['Address', l.address], ['Contact', l.contact], ['Status', l.status], ['Permit', l.permit], ['Cost', l.cost != null ? i.format(l.cost) : null], ['Scenes', l.appearances.length], ['Shoot days', l.days.length ? list(l.days) : null], ['Pages', l.pages]] },
    ];
    if (l.notes?.trim()) inner.push({ type: 'section', title: 'Notes', blocks: [{ type: 'text', text: l.notes.trim() }] });
    inner.push(l.appearances.length
      ? {
        type: 'section', title: 'Where it appears', blocks: [{
          type: 'table',
          columns: [{ key: 'sc', label: 'Sc', align: 'right', width: '6%' }, { key: 'heading', label: 'Heading' }, { key: 'story', label: 'Story day', width: '11%' }, { key: 'shoot', label: 'Shoot day', width: '16%' }, { key: 'pages', label: 'Pages', align: 'right', width: '9%' }],
          rows: l.appearances.map((a) => ({
            sc: a.number, heading: a.heading || [a.intExt, a.time].filter(Boolean).join(' · '), story: a.storyDay ?? null,
            shoot: a.shootDay != null ? `${a.shootDay}${a.shootDate ? ` · ${a.shootDate}` : ''}` : null, pages: a.pages,
          })),
        }],
      }
      : { type: 'note', text: 'Not in the script yet: no scene is set here.' });
    if (l.warnings.length) inner.push({ type: 'section', title: 'Worth a look', blocks: [{ type: 'list', items: l.warnings }] });
    blocks.push({ type: 'pageBreak' }, { type: 'section', title: l.name, blocks: inner });
  }
  return {
    title: 'World bible',
    kind: i.project,
    accent: i.accent, logo: i.logo,
    meta: [['Locations', i.locations.length], ['In the script', inScript], ['Checks', checks]],
    blocks,
    footer: i.project,
    generated: i.generated,
  };
}
