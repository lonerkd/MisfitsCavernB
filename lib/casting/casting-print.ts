// The printed casting sheet: an overview of every role (who is cast, how many are on the shortlist), then one section for each role with
// who is cast, the candidates side by side (status, reel, note) and the casting notes. Built on the print kit, which escapes every
// string, so a note with markup prints as text. Pure: the board hands over what it shows.
import type { PrintBlock, PrintDoc } from '@/lib/print/kit';

export interface CastingPrintRole {
  character: string;
  cast: string | null;
  candidates: Array<{ name: string; status: string; reel: string | null; note: string | null }>;
  notes: string[];
}

export interface CastingPrintInput {
  project: string;
  accent?: string | null;
  logo?: string | null;
  roles: CastingPrintRole[];
  generated: string;
}

export function castingSheetDoc(i: CastingPrintInput): PrintDoc {
  const cast = i.roles.filter((r) => r.cast).length;
  const blocks: PrintBlock[] = [
    {
      type: 'table',
      columns: [{ key: 'role', label: 'Role' }, { key: 'cast', label: 'Cast', width: '30%' }, { key: 'shortlist', label: 'Shortlist', align: 'right', width: '12%' }],
      rows: i.roles.map((r) => ({ role: r.character, cast: r.cast ?? 'open', shortlist: r.candidates.length || null })),
      empty: 'No roles yet.',
    },
  ];
  for (const r of i.roles) {
    const inner: PrintBlock[] = [{ type: 'facts', items: [['Cast', r.cast ?? 'open'], ['Shortlist', r.candidates.length]] }];
    if (r.candidates.length) {
      inner.push({
        type: 'section', title: 'Candidates', blocks: [{
          type: 'table',
          columns: [{ key: 'name', label: 'Candidate', width: '24%' }, { key: 'status', label: 'Status', width: '14%' }, { key: 'reel', label: 'Reel' }, { key: 'note', label: 'Note' }],
          rows: r.candidates.map((c) => ({ name: c.name, status: c.status, reel: c.reel, note: c.note })),
        }],
      });
    }
    if (r.notes.length) inner.push({ type: 'section', title: 'Notes', blocks: [{ type: 'list', items: r.notes }] });
    blocks.push({ type: 'pageBreak' }, { type: 'section', title: r.character, blocks: inner });
  }
  return {
    title: 'Casting sheet',
    kind: i.project,
    accent: i.accent, logo: i.logo,
    meta: [['Roles', i.roles.length], ['Cast', cast], ['Open', i.roles.length - cast]],
    blocks,
    footer: i.project,
    generated: i.generated,
  };
}
