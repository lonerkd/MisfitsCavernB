// The printed world notes (lore, rules, timeline and mapped places), on the print kit. Pure: the editor hands over what it shows.
import type { PrintDoc } from '@/lib/print/kit';
import type { World } from '@/lib/world/world';

export interface WorldNotesPrintInput {
  world: World;
  project?: string | null;
  accent?: string | null;
  logo?: string | null;
  generated: string;
}

export function worldNotesDoc(i: WorldNotesPrintInput): PrintDoc {
  const { world: w } = i;
  const project = i.project?.trim() || 'Project';
  return {
    title: 'World notes',
    kind: project,
    accent: i.accent, logo: i.logo,
    meta: [['Places', w.locations.length], ['Lore', w.lore.length], ['Rules', w.rules.length], ['Timeline', w.timeline.length]],
    blocks: [
      {
        type: 'table', title: 'Places',
        columns: [{ key: 'name', label: 'Place', width: '22%' }, { key: 'description', label: 'Description' }, { key: 'mood', label: 'Mood', width: '16%' }, { key: 'lat', label: 'Lat', align: 'right', width: '8%' }, { key: 'lng', label: 'Lng', align: 'right', width: '8%' }],
        rows: w.locations.map((l) => ({ name: l.name, description: l.description, mood: l.mood, lat: l.lat ?? null, lng: l.lng ?? null })),
        empty: 'No places yet.',
      },
      {
        type: 'table', title: 'Lore',
        columns: [{ key: 'title', label: 'Title', width: '24%' }, { key: 'body', label: 'Note' }],
        rows: w.lore.map((l) => ({ title: l.title, body: l.body })), empty: 'No lore yet.',
      },
      {
        type: 'table', title: 'Rules of the world',
        columns: [{ key: 'rule', label: 'Rule' }],
        rows: w.rules.map((r) => ({ rule: r.rule })), empty: 'No rules yet.',
      },
      {
        type: 'table', title: 'Timeline',
        columns: [{ key: 'when', label: 'When', width: '24%' }, { key: 'what', label: 'What happens' }],
        rows: w.timeline.map((t) => ({ when: t.when, what: t.what })), empty: 'Nothing on the timeline yet.',
      },
    ],
    footer: project,
    generated: i.generated,
  };
}
