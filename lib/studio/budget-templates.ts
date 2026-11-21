// Budget templates and the line: a template's lines, its total, and a budget grouped above and below the line with subtotals. Pure.
import type { LineMoney } from './money';

export interface TemplateLine { category: string; name: string; amount: number; above_the_line: boolean }
export interface BudgetTemplate { id: string; name: string; description: string; sort_order: number; lines: TemplateLine[] }

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);

/** Reads a template row from the database, keeping only well-formed lines (the column is free jsonb an admin edits). */
export function parseTemplate(row: { id: string; name: string; description: string; sort_order: number; lines: unknown }): BudgetTemplate {
  const raw = Array.isArray(row.lines) ? row.lines : [];
  const lines: TemplateLine[] = [];
  for (const l of raw as Array<Record<string, unknown> | null>) {
    if (!l || typeof l.name !== 'string' || !l.name.trim()) continue;
    lines.push({ category: typeof l.category === 'string' ? l.category : '', name: l.name.trim(), amount: Math.max(0, num(l.amount)), above_the_line: l.above_the_line === true });
  }
  return { id: row.id, name: row.name, description: row.description ?? '', sort_order: row.sort_order ?? 0, lines };
}

export const templateTotal = (t: Pick<BudgetTemplate, 'lines'>) => Math.round(t.lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;

/** The budget line a template line becomes: its name is the line, its group is the description. */
export const templateLineToItem = (l: TemplateLine) => ({ category: l.name, description: l.category, amount: l.amount, above_the_line: l.above_the_line });

export interface LineGroup { key: 'above' | 'below'; label: string; lines: LineMoney[]; subtotal: { planned: number; committed: number; paid: number; left: number } }

const cents = (v: number) => Math.round(v * 100) / 100;

/** Splits money lines into "Above the line" and "Below the line" (in that order, empty groups left out), each with its subtotal. */
export function groupAboveBelow(lines: LineMoney[], above: ReadonlySet<string>): LineGroup[] {
  const make = (key: 'above' | 'below', label: string, rows: LineMoney[]): LineGroup => ({
    key, label, lines: rows,
    subtotal: {
      planned: cents(rows.reduce((s, l) => s + l.planned, 0)), committed: cents(rows.reduce((s, l) => s + l.committed, 0)),
      paid: cents(rows.reduce((s, l) => s + l.paid, 0)), left: cents(rows.reduce((s, l) => s + l.left, 0)),
    },
  });
  const groups = [make('above', 'Above the line', lines.filter((l) => above.has(l.id))), make('below', 'Below the line', lines.filter((l) => !above.has(l.id)))];
  return groups.filter((g) => g.lines.length > 0);
}
