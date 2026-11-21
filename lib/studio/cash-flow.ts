// Cash flow: money out by week, from the project's real records. Paid spend lands on the day it was paid, committed spend (a purchase
// order out, not yet paid) on its own date, approved labour on the day the hours were worked. A running total is set against the planned
// budget and the first week it goes over is marked. What was planned and has not yet been spent or scheduled is the remainder. Pure.

import type { BudgetLine } from './money';

export interface CashExpense { amount: number | string; status: string; spent_on: string | null; paid_at?: string | null }
export interface CashHours { hours: number | string; rate: number | string | null; status: string; work_date: string | null }

export interface CashFlowWeek {
  /** The Monday that starts the week, YYYY-MM-DD. */
  start: string;
  /** The Sunday that ends it. */
  end: string;
  paid: number;
  committed: number;
  /** Labour: approved hours at their rate, plus submitted hours that already carry a rate. */
  labour: number;
  total: number;
  /** Everything out up to and including this week. */
  running: number;
  /** The running total is above the planned budget (only when a budget is planned). */
  over: boolean;
  /** This is the first week it is. */
  crossing: boolean;
}

export interface CashFlow {
  weeks: CashFlowWeek[];
  /** Spend whose date is missing or unreadable: counted in the totals, after the last week. */
  undated: { paid: number; committed: number; labour: number; total: number };
  planned: number;
  /** All money out, dated or not. */
  spent: number;
  /** Planned and not yet spent (never below zero): the part with nothing scheduled against it. */
  remaining: number;
  /** Spent above the plan (zero when within it, or when nothing is planned). */
  overBy: number;
  /** The Monday of the week the running total first exceeds the plan; null when it never does, or the crossing is in undated spend. */
  crossingWeek: string | null;
  /** The crossing happens only once the undated spend is added. */
  crossingUndated: boolean;
  /** Submitted hours still to be approved, and approved hours with no rate: neither is money here yet. */
  pendingHours: number;
  unratedHours: number;
}

const n = (v: number | string | null | undefined) => (v == null || v === '' ? 0 : Number(v) || 0);
const cents = (v: number) => Math.round(v * 100) / 100;
const DAY = 86_400_000;

/** A YYYY-MM-DD (or an ISO timestamp, whose date part is used) as a UTC day number, or null when it is not a real date. */
function dayOf(raw: string | null | undefined): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw ?? '');
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(t);
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? Math.floor(t / DAY) : null;
}
const iso = (day: number) => new Date(day * DAY).toISOString().slice(0, 10);
/** The Monday on or before a day number (1970-01-01 was a Thursday). */
const monday = (day: number) => day - ((day + 3) % 7);

export function cashFlow(lines: BudgetLine[], expenses: CashExpense[], hours: CashHours[]): CashFlow {
  type Bucket = { paid: number; committed: number; labour: number };
  const weeks = new Map<number, Bucket>();
  const undated: Bucket = { paid: 0, committed: 0, labour: 0 };
  const put = (day: number | null, kind: keyof Bucket, amount: number) => {
    if (!amount) return;
    if (day == null) { undated[kind] += amount; return; }
    const key = monday(day);
    const b = weeks.get(key) ?? { paid: 0, committed: 0, labour: 0 };
    b[kind] += amount;
    weeks.set(key, b);
  };

  for (const e of expenses) {
    if (e.status === 'paid') put(dayOf(e.paid_at) ?? dayOf(e.spent_on), 'paid', n(e.amount));
    else put(dayOf(e.spent_on), 'committed', n(e.amount));
  }
  let pendingHours = 0;
  let unratedHours = 0;
  for (const t of hours) {
    if (t.status === 'approved') {
      if (t.rate == null) unratedHours += n(t.hours);
      else put(dayOf(t.work_date), 'labour', n(t.hours) * n(t.rate));
    } else if (t.status === 'submitted') {
      if (t.rate != null) put(dayOf(t.work_date), 'labour', n(t.hours) * n(t.rate));
      else pendingHours += n(t.hours);
    }
  }

  const planned = cents(lines.reduce((s, l) => s + n(l.amount), 0));
  let running = 0;
  let crossingWeek: string | null = null;
  const out: CashFlowWeek[] = [...weeks.keys()].sort((a, b) => a - b).map((key) => {
    const b = weeks.get(key)!;
    const total = cents(b.paid + b.committed + b.labour);
    running = cents(running + total);
    const over = planned > 0 && running > planned;
    const crossing = over && crossingWeek === null;
    if (crossing) crossingWeek = iso(key);
    return { start: iso(key), end: iso(key + 6), paid: cents(b.paid), committed: cents(b.committed), labour: cents(b.labour), total, running, over, crossing };
  });

  const undatedTotal = cents(undated.paid + undated.committed + undated.labour);
  const spent = cents(running + undatedTotal);
  return {
    weeks: out,
    undated: { paid: cents(undated.paid), committed: cents(undated.committed), labour: cents(undated.labour), total: undatedTotal },
    planned, spent,
    remaining: cents(Math.max(0, planned - spent)),
    overBy: planned > 0 ? cents(Math.max(0, spent - planned)) : 0,
    crossingWeek,
    crossingUndated: planned > 0 && crossingWeek === null && spent > planned,
    pendingHours, unratedHours,
  };
}
