// The printed locations list: each place the script uses, its address and contact, whether it is confirmed, its permit, its cost and
// the scenes and days that shoot there. Built on the print kit; landscape. Pure.
import type { PrintDoc } from '@/lib/print/kit';

export interface LocationPrintRow {
  name: string;
  address: string | null;
  contact: string | null;
  status: string;
  permit: string;
  cost: number | null;
  scenes: number[];
  days: number[];
  notes: string | null;
}

export interface LocationsPrintInput {
  project: string;
  accent?: string | null;
  rows: LocationPrintRow[];
  format: (n: number) => string;
  generated: string;
}

const list = (ns: number[]) => ns.join(', ');

export function locationsDoc(i: LocationsPrintInput): PrintDoc {
  const confirmed = i.rows.filter((r) => r.status === 'Confirmed').length;
  const total = i.rows.reduce((t, r) => t + (r.cost ?? 0), 0);
  return {
    title: 'Locations',
    kind: i.project,
    accent: i.accent,
    meta: [['Locations', i.rows.length], ['Confirmed', i.rows.length ? `${confirmed} of ${i.rows.length}` : null], ['Cost', total ? i.format(total) : null]],
    blocks: [{
      type: 'table',
      columns: [{ key: 'name', label: 'Location', width: '16%' }, { key: 'address', label: 'Address and contact' }, { key: 'status', label: 'Status', width: '10%' }, { key: 'permit', label: 'Permit', width: '13%' }, { key: 'cost', label: 'Cost', align: 'right', width: '8%' }, { key: 'when', label: 'Scenes · days', width: '14%' }, { key: 'notes', label: 'Notes', width: '16%' }],
      rows: i.rows.map((r) => ({
        name: r.name,
        address: [r.address, r.contact].filter(Boolean).join('\n'),
        status: r.status, permit: r.permit, cost: r.cost ? i.format(r.cost) : null,
        when: [r.scenes.length ? `Sc ${list(r.scenes)}` : null, r.days.length ? `Day ${list(r.days)}` : null].filter(Boolean).join('\n'),
        notes: r.notes,
      })),
      empty: 'No locations yet.',
    }],
    footer: i.project,
    generated: i.generated,
    orientation: 'landscape',
  };
}
