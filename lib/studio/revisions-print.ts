// The printed revision history: each locked draft with its colour and date, newest first, the way a script supervisor files them.
// Built on the print kit. Pure: the view hands over the locked revisions it shows.
import type { PrintDoc } from '@/lib/print/kit';

export interface RevisionPrintRow { colour: string; label: string; date: string | null }

export interface RevisionsPrintInput {
  project: string;
  script: string;
  accent?: string | null;
  /** In the order they were locked (oldest first); printed newest first. */
  revisions: RevisionPrintRow[];
  generated: string;
}

export function revisionsDoc(i: RevisionsPrintInput): PrintDoc {
  const newest = [...i.revisions].reverse();
  return {
    title: 'Script revisions',
    kind: i.project,
    subtitle: i.script,
    accent: i.accent,
    meta: [['Locked drafts', i.revisions.length], ['Latest', newest[0] ? `${newest[0].colour}${newest[0].date ? ` · ${newest[0].date}` : ''}` : null]],
    blocks: [{
      type: 'table',
      columns: [{ key: 'colour', label: 'Colour', width: '18%' }, { key: 'label', label: 'Draft' }, { key: 'date', label: 'Locked', width: '18%' }],
      rows: newest.map((r) => ({ colour: r.colour, label: r.label, date: r.date })),
      empty: 'No drafts have been locked yet.',
    }],
    footer: `${i.project} · ${i.script}`,
    generated: i.generated,
  };
}
