// The printed paperwork index (owner's call, 2026-11-08): what the production holds and where each piece stands: permits, insurance,
// releases, contracts, each with who or what it is with, its status (and expiry), and whether a file is attached; then what is still needed.
// It is an index, never the documents themselves: files stay private in storage and nothing about their contents is printed. Built on the
// print kit. Pure.
import type { PrintBlock, PrintDoc } from '@/lib/print/kit';

export interface PaperworkPrintGroup {
  /** "Permits", "Releases" ... */
  label: string;
  rows: Array<{ title: string; with: string | null; status: string; expires: string | null; hasFile: boolean }>;
}

export interface PaperworkPrintInput {
  project: string;
  accent?: string | null;
  groups: PaperworkPrintGroup[];
  /** What is still needed, already worded ("Permit for CAIS DO SODRÉ: scenes shoot there"). Empty for crew, who see only their own papers. */
  needed: string[];
  generated: string;
}

export function paperworkDoc(i: PaperworkPrintInput): PrintDoc {
  const blocks: PrintBlock[] = [];
  if (i.needed.length) blocks.push({ type: 'section', title: 'Still needed', blocks: [{ type: 'list', items: i.needed }] });
  for (const g of i.groups) {
    blocks.push({
      type: 'section', title: `${g.label} · ${g.rows.length}`,
      blocks: [{
        type: 'table',
        columns: [{ key: 'title', label: 'Document' }, { key: 'with', label: 'With', width: '22%' }, { key: 'status', label: 'Status', width: '24%' }, { key: 'expires', label: 'Expires', width: '13%' }, { key: 'file', label: 'File', width: '8%' }],
        rows: g.rows.map((r) => ({ title: r.title, with: r.with, status: r.status, expires: r.expires, file: r.hasFile ? 'Yes' : 'No' })),
      }],
    });
  }
  if (!i.groups.length && !i.needed.length) blocks.push({ type: 'note', text: 'No paperwork yet.' });
  const all = i.groups.flatMap((g) => g.rows);
  return {
    title: 'Paperwork',
    kind: i.project,
    accent: i.accent,
    meta: [['Documents', all.length || null], ['With a file', all.length ? `${all.filter((r) => r.hasFile).length} of ${all.length}` : null], ['Still needed', i.needed.length || null]],
    blocks,
    footer: i.project,
    generated: i.generated,
  };
}
