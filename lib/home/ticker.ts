// The home page's ticker: what is actually happening in the suite — totals,
// who's hiring, what was just published — instead of a fixed list of feature
// names. Everything here is public data (platform counts RPC, open jobs,
// published portfolio works).

export interface TickerStats { users: number; scripts: number; projects: number; jobs: number; media: number }
export interface TickerJob { title: string; role: string | null; location?: string | null }
export interface TickerWork { title: string; year: number | null; category: string | null; role: string | null }

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

/** Ticker lines, interleaving news (jobs, works) with totals; empty when there's nothing real to say. */
export function tickerItems(stats: TickerStats | null, jobs: TickerJob[], works: TickerWork[]): string[] {
  const totals: string[] = [];
  if (stats) {
    if (stats.users) totals.push(plural(stats.users, 'filmmaker'));
    if (stats.scripts) totals.push(`${plural(stats.scripts, 'screenplay')} in progress`);
    if (stats.projects) totals.push(plural(stats.projects, 'production'));
    if (stats.jobs) totals.push(`${plural(stats.jobs, 'open role')}`);
  }
  const news = [
    ...jobs.map((j) => {
      const what = j.role && j.role !== j.title ? `${j.role} — ${j.title}` : j.title;
      return `Hiring · ${what}${j.location ? ` · ${j.location}` : ''}`;
    }),
    ...works.map((w) => `New work · ${w.title}${w.year ? ` (${w.year})` : ''}${w.category ? ` · ${w.category}` : ''}`),
  ];
  const out: string[] = [];
  const n = Math.max(totals.length, news.length);
  for (let i = 0; i < n; i++) {
    if (news[i]) out.push(news[i]);
    if (totals[i]) out.push(totals[i]);
  }
  return out;
}
