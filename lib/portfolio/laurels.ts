// Festivals and awards on a portfolio, in two tiers: VERIFIED (the film's own accepted festival submissions, set by the film's owner) and
// SELF-REPORTED (what a person says about their own piece). The page says which is which. Pure, so the page and the tests read the same words.

export const LAUREL_KINDS = ['selection', 'award', 'nomination', 'screening'] as const;
export type LaurelKindName = (typeof LAUREL_KINDS)[number];

export const LAUREL_KIND_LABEL: Record<LaurelKindName, string> = { selection: 'Official selection', award: 'Award', nomination: 'Nomination', screening: 'Screening' };

export interface LaurelLike { name: string; kind: string; year?: number | null }

/** "Official selection · Local Shorts Night · 2026" */
export function laurelLine(l: LaurelLike): string {
  const kind = LAUREL_KIND_LABEL[l.kind as LaurelKindName] ?? 'Laurel';
  return [kind, l.name, l.year ?? null].filter(Boolean).join(' · ');
}

/** A year typed by a person: a whole year from 1888 to 2100, or null for none. NaN-safe; anything else is refused with null. */
export function parseYear(v: string): number | null {
  const n = Number.parseInt(v.trim(), 10);
  return Number.isFinite(n) && n >= 1888 && n <= 2100 ? n : null;
}
