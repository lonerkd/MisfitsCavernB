// Money, summed: each budget line's plan against what's committed (purchase
// orders out) and paid, plus approved labour from timesheets. Pure.

export interface BudgetLine { id: string; category: string; description?: string | null; amount: number | string | null }
export interface SpendLine { id: string; budget_item_id: string | null; amount: number | string; status: string }
export interface HoursLine { user_id: string | null; hours: number | string; rate: number | string | null; status: string }

export interface LineMoney {
  id: string;
  label: string;
  planned: number;
  committed: number;
  paid: number;
  /** Planned less committed and paid; negative is over. */
  left: number;
}

export interface MoneySummary {
  lines: LineMoney[];
  /** Spend not charged to any budget line. */
  unassigned: { committed: number; paid: number };
  labour: { paid: number; hours: number; pendingHours: number; unratedHours: number };
  totals: { planned: number; committed: number; paid: number; left: number };
}

const n = (v: number | string | null | undefined) => (v == null || v === '' ? 0 : Number(v) || 0);
const cents = (v: number) => Math.round(v * 100) / 100;

export function moneySummary(lines: BudgetLine[], spend: SpendLine[], hours: HoursLine[]): MoneySummary {
  const byLine = new Map<string, { committed: number; paid: number }>();
  const unassigned = { committed: 0, paid: 0 };
  for (const e of spend) {
    const bucket = e.budget_item_id ? (byLine.get(e.budget_item_id) ?? { committed: 0, paid: 0 }) : unassigned;
    if (e.status === 'paid') bucket.paid += n(e.amount); else bucket.committed += n(e.amount);
    if (e.budget_item_id) byLine.set(e.budget_item_id, bucket);
  }
  const out = lines.map((l) => {
    const m = byLine.get(l.id) ?? { committed: 0, paid: 0 };
    const planned = n(l.amount);
    return {
      id: l.id,
      label: l.description ? `${l.category} — ${l.description}` : l.category,
      planned: cents(planned), committed: cents(m.committed), paid: cents(m.paid),
      left: cents(planned - m.committed - m.paid),
    };
  });

  const labour = { paid: 0, hours: 0, pendingHours: 0, unratedHours: 0 };
  for (const t of hours) {
    if (t.status === 'approved') {
      labour.hours += n(t.hours);
      if (t.rate == null) labour.unratedHours += n(t.hours);
      else labour.paid += n(t.hours) * n(t.rate);
    } else if (t.status === 'submitted') {
      labour.pendingHours += n(t.hours);
    }
  }
  labour.paid = cents(labour.paid);

  const planned = out.reduce((s, l) => s + l.planned, 0);
  const committed = out.reduce((s, l) => s + l.committed, 0) + unassigned.committed;
  const paid = out.reduce((s, l) => s + l.paid, 0) + unassigned.paid + labour.paid;
  return {
    lines: out,
    unassigned: { committed: cents(unassigned.committed), paid: cents(unassigned.paid) },
    labour,
    totals: { planned: cents(planned), committed: cents(committed), paid: cents(paid), left: cents(planned - committed - paid) },
  };
}

export const money = (v: number) =>
  (v < 0 ? '−' : '') + '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });

export interface DayLabour { paid: number; hours: number; pendingHours: number; unratedHours: number }

/**
 * Labour on each shoot day, from the hours people logged on the day's date (the same rules as the money summary: approved hours at
 * their rate are labour, submitted hours are pending, approved hours with no rate are unrated). Days with no date have no labour here.
 * `days` maps a shoot day number to its date (YYYY-MM-DD). Pure.
 */
export function labourByDay(hours: Array<HoursLine & { work_date: string }>, days: ReadonlyMap<number, string>): Map<number, DayLabour> {
  const dayOf = new Map<string, number>();
  for (const [day, date] of days) dayOf.set(date, day);
  const out = new Map<number, DayLabour>();
  for (const t of hours) {
    const day = dayOf.get(t.work_date);
    if (day == null) continue;
    const row = out.get(day) ?? { paid: 0, hours: 0, pendingHours: 0, unratedHours: 0 };
    if (t.status === 'approved') {
      row.hours += n(t.hours);
      if (t.rate == null) row.unratedHours += n(t.hours);
      else row.paid += n(t.hours) * n(t.rate);
    } else if (t.status === 'submitted') {
      row.pendingHours += n(t.hours);
    }
    out.set(day, row);
  }
  for (const row of out.values()) row.paid = cents(row.paid);
  return out;
}
