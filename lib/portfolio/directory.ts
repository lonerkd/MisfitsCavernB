// The public directory of portfolios (/portfolios): how a request is read and how the pages link. Pure, so the page and the tests
// read the same rules. What is listed is decided by the database (list_public_portfolios): only people whose page is public.

export const DIRECTORY_PAGE_SIZE = 24;
const MAX_QUERY = 80;
const MAX_PAGE = 1000;

/** The search text from the address: trimmed, one string, at most 80 characters; nothing when empty. */
export function parseQuery(v: string | string[] | undefined): string {
  const one = Array.isArray(v) ? v[0] : v;
  return (one ?? '').trim().slice(0, MAX_QUERY);
}

/** The page number from the address: a whole number from 1, anything else is page 1. */
export function parsePage(v: string | string[] | undefined): number {
  const one = Array.isArray(v) ? v[0] : v;
  const n = Number.parseInt(one ?? '', 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, MAX_PAGE) : 1;
}

/** The address of a directory page, leaving out what is the default. */
export function directoryHref(q: string, page: number): string {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/portfolios?${qs}` : '/portfolios';
}
