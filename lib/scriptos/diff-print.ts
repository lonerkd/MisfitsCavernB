// The printed change list for one revision against the current draft: every line that went in or came out, in script order.
// Built on the print kit. Pure: the diff modal hands over the line changes it shows (the `diff` package's shape).
import type { PrintDoc } from '@/lib/print/kit';

export interface DiffPart { value: string; added?: boolean; removed?: boolean }

export interface DiffPrintInput {
  label: string;
  project?: string | null;
  accent?: string | null;
  logo?: string | null;
  changes: DiffPart[];
  generated: string;
}

export function diffDoc(i: DiffPrintInput): PrintDoc {
  const rows: Array<{ change: string; line: string }> = [];
  let added = 0, removed = 0, same = 0;
  for (const c of i.changes) {
    const lines = c.value.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    if (c.added) { added += lines.length; for (const t of lines) rows.push({ change: 'Added', line: t }); }
    else if (c.removed) { removed += lines.length; for (const t of lines) rows.push({ change: 'Cut', line: t }); }
    else same += lines.length;
  }
  const project = i.project?.trim() || 'Script';
  return {
    title: `Changes since ${i.label}`,
    kind: project,
    accent: i.accent, logo: i.logo,
    meta: [['Lines added', added], ['Lines cut', removed], ['Lines unchanged', same]],
    blocks: [{
      type: 'table',
      columns: [{ key: 'change', label: 'Change', width: '10%' }, { key: 'line', label: 'Line' }],
      rows, empty: 'Nothing has changed since this revision.',
    }],
    footer: project,
    generated: i.generated,
  };
}
