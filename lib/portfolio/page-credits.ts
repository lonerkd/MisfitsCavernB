// The films a person's page lists as their credits: one entry per film, its credits together ("Production designer", "Plays MAYA"),
// newest first as the database sent them. Pure, so the page and the tests read the same rules.
import { creditLabel } from '@/lib/credits/core';

export interface PageCreditRow {
  title: string; year: number | null; project_type: string | null; accent_color: string | null; share_token: string;
  kind: string; credit: string; character_name: string | null;
}

export interface PageFilm { token: string; title: string; year: number | null; type: string | null; labels: string[] }

export function groupPageCredits(rows: ReadonlyArray<PageCreditRow>): PageFilm[] {
  const films = new Map<string, PageFilm>();
  for (const r of rows) {
    const film = films.get(r.share_token) ?? { token: r.share_token, title: r.title, year: r.year, type: r.project_type, labels: [] };
    const label = creditLabel(r);
    if (!film.labels.includes(label)) film.labels.push(label);
    films.set(r.share_token, film);
  }
  return [...films.values()];
}
