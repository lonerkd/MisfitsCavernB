// Budget fringes and per diems, as the database computes them (supabase/migrations/20261122000500_budget_fringes.sql): the line's base
// `amount` stays what was typed, the fringe is the sum of its fringes in cents, the line's cost is base + fringe. Pure, so the screen can
// preview a line before it is saved; the stored `fringe_amount` is the database's own figure and is what every total reads.

export interface Fringe { id: string; name: string; percent: number; cap_per_line: number | null }

// Half a cent rounds up, as the database does (numeric rounds half away from zero); the epsilon steps over binary noise like 249.97499999.
const cents = (v: number) => Math.sign(v) * Math.round((Math.abs(v) + 1e-9) * 100) / 100;
const n = (v: number | string | null | undefined) => (v == null || v === '' ? 0 : Number(v) || 0);

/** One fringe on a base amount: the percent of it, to the cent, and never more than the cap when there is one. */
export function fringeOn(base: number, f: Pick<Fringe, 'percent' | 'cap_per_line'>): number {
  const raw = cents(n(base) * n(f.percent) / 100);
  return f.cap_per_line == null ? raw : Math.min(raw, n(f.cap_per_line));
}

/** All the fringes applied to a line, summed in cents. */
export function fringeTotal(base: number, applied: ReadonlyArray<Pick<Fringe, 'percent' | 'cap_per_line'>>): number {
  return cents(applied.reduce((sum, f) => sum + fringeOn(base, f), 0));
}

/** A per diem or allowance: days x daily rate x people, to the cent. */
export function perDiemAmount(days: number | string | null | undefined, rate: number | string | null | undefined, people: number | string | null | undefined): number {
  return cents(n(days) * n(rate) * n(people));
}

/** What a line costs: its base plus its fringe. */
export const lineCost = (l: { amount: number | string | null; fringe_amount?: number | string | null }): number => cents(n(l.amount) + n(l.fringe_amount));
