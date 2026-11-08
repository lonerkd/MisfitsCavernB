// The printed cast breakdown: every character, who plays them (or that they are uncast), how many scenes they are in and on which shoot
// days, most-used first. Built on the print kit. Pure: the view hands over the rows it shows.
import type { PrintDoc } from '@/lib/print/kit';

export interface CastPrintRow { character: string; actor: string | null; scenes: number; days: number[]; arc: string | null }

export interface CastPrintInput {
  project: string;
  accent?: string | null;
  rows: CastPrintRow[];
  generated: string;
}

export function castDoc(i: CastPrintInput): PrintDoc {
  const cast = i.rows.filter((r) => r.actor).length;
  const uncast = i.rows.length - cast;
  return {
    title: 'Cast breakdown',
    kind: i.project,
    accent: i.accent,
    meta: [['Characters', i.rows.length], ['Cast', i.rows.length ? `${cast} of ${i.rows.length}` : null]],
    blocks: [
      ...(uncast > 0 ? [{ type: 'note' as const, tone: 'warn' as const, text: `${uncast} character${uncast === 1 ? ' is' : 's are'} still uncast.` }] : []),
      {
        type: 'table',
        columns: [{ key: 'character', label: 'Character' }, { key: 'actor', label: 'Played by', width: '22%' }, { key: 'scenes', label: 'Scenes', align: 'right', width: '9%' }, { key: 'days', label: 'Shoot days', width: '18%' }, { key: 'arc', label: 'Arc' }],
        rows: i.rows.map((r) => ({ character: r.character, actor: r.actor ?? 'Uncast', scenes: r.scenes, days: r.days.length ? r.days.join(', ') : null, arc: r.arc })),
        empty: 'No characters yet.',
      },
    ],
    footer: i.project,
    generated: i.generated,
  };
}
