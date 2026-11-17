// Money totals for the purchase orders tool. A PO amount is typed by a person ("$1,500", "EUR 200.50", "1500"),
// so the reader is tolerant: currency symbols and thousands separators are stripped, and anything that is not a number
// is ignored rather than counted as zero or thrown.

/** Reads a typed amount. Returns null when there is no usable number in it. */
export function parseAmount(raw: string | number | null | undefined): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/[^0-9.-]/g, '');
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** The sum of the purchase orders that are committed (approved) or spent (paid). Drafts do not count. */
export function approvedPoTotal(pos: ReadonlyArray<{ amount: string; status: string }>): number {
  return pos.reduce((sum, po) => {
    if (po.status !== 'approved' && po.status !== 'paid') return sum;
    return sum + (parseAmount(po.amount) ?? 0);
  }, 0);
}
