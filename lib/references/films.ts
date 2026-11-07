// Film search for references: find a film by its title, its director or its cinematographer, read from Wikidata
// (open data, CC0, no key). The pure parts live here: the query a search turns into and how its answer is read.

export const FILM_SEARCH_BY = ['title', 'director', 'cinematographer'] as const;
export type FilmSearchBy = (typeof FILM_SEARCH_BY)[number];

export const FILM_SEARCH_LABEL: Record<FilmSearchBy, string> = { title: 'Title', director: 'Director', cinematographer: 'Cinematographer' };

export interface FilmResult {
  id: string;
  title: string;
  year: number | null;
  directors: string[];
  cinematographers: string[];
  genres: string[];
  description: string | null;
  /** The film's page (its Wikipedia article when there is one, else Wikidata). */
  url: string;
}

/** Wikidata ids are Q and digits; anything else never reaches a query. */
export const isEntityId = (v: unknown): v is string => typeof v === 'string' && /^Q[1-9]\d{0,11}$/.test(v);

const FILM_CLASS = 'wd:Q11424'; // film

/**
 * The SPARQL for a set of entity ids: for a title, those ids are candidate films; for a director or cinematographer,
 * they are the people, and the films they made. One row per film and role; `parseFilms` folds them together.
 */
export function buildFilmsQuery(by: FilmSearchBy, ids: readonly string[], limit = 30): string {
  const safe = ids.filter(isEntityId);
  if (!safe.length) throw new Error('no entities to search for');
  const values = safe.map((i) => `wd:${i}`).join(' ');
  const match = by === 'title'
    ? `VALUES ?film { ${values} } ?film wdt:P31/wdt:P279* ${FILM_CLASS}.`
    : `VALUES ?person { ${values} } ?film ${by === 'director' ? 'wdt:P57' : 'wdt:P344'} ?person. ?film wdt:P31/wdt:P279* ${FILM_CLASS}.`;
  const n = Math.max(1, Math.min(60, Math.floor(limit)));
  return `SELECT ?film ?filmLabel ?filmDescription ?year ?director ?directorLabel ?dp ?dpLabel ?genreLabel ?article WHERE {
  ${match}
  OPTIONAL { ?film wdt:P577 ?date. BIND(YEAR(?date) AS ?year) }
  OPTIONAL { ?film wdt:P57 ?director. }
  OPTIONAL { ?film wdt:P344 ?dp. }
  OPTIONAL { ?film wdt:P136 ?genre. }
  OPTIONAL { ?article schema:about ?film; schema:isPartOf <https://en.wikipedia.org/>. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul". }
} ORDER BY DESC(?year) LIMIT ${n * 8}`;
}

interface Binding { [k: string]: { value: string } | undefined }

const val = (b: Binding, k: string) => b[k]?.value;
const idOf = (uri: string | undefined) => (uri ? uri.slice(uri.lastIndexOf('/') + 1) : '');
const add = (list: string[], v: string | undefined) => { if (v && !/^Q\d+$/.test(v) && !list.includes(v)) list.push(v); };

/** Fold the rows (one per film x director x cinematographer x genre) into one result per film, newest first. */
export function parseFilms(json: unknown, limit = 30): FilmResult[] {
  const rows = ((json as { results?: { bindings?: Binding[] } } | null)?.results?.bindings) ?? [];
  const films = new Map<string, FilmResult>();
  for (const b of rows) {
    const id = idOf(val(b, 'film'));
    const title = val(b, 'filmLabel');
    if (!isEntityId(id) || !title || /^Q\d+$/.test(title)) continue; // a film with no English label is not one a person can search for
    let f = films.get(id);
    if (!f) {
      const year = Number(val(b, 'year'));
      f = {
        id, title, year: Number.isFinite(year) && year > 1800 ? year : null, directors: [], cinematographers: [], genres: [],
        description: val(b, 'filmDescription') ?? null,
        url: val(b, 'article') ?? `https://www.wikidata.org/wiki/${id}`,
      };
      films.set(id, f);
    }
    add(f.directors, val(b, 'directorLabel'));
    add(f.cinematographers, val(b, 'dpLabel'));
    add(f.genres, val(b, 'genreLabel'));
  }
  return [...films.values()].sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title)).slice(0, limit);
}

/** The line a film becomes in the library's notes: who made it and how it looks. */
export function filmNotes(f: FilmResult): string {
  return [
    f.year ? `${f.title} (${f.year})` : f.title,
    f.directors.length ? `Directed by ${f.directors.slice(0, 3).join(', ')}` : '',
    f.cinematographers.length ? `Cinematography by ${f.cinematographers.slice(0, 3).join(', ')}` : '',
    f.genres.length ? f.genres.slice(0, 4).join(', ') : '',
    f.description ?? '',
    `Source: Wikidata (CC0), ${f.url}`,
  ].filter(Boolean).join('\n');
}

export interface FilmSearchResponse { films: FilmResult[]; by: FilmSearchBy; unavailable?: boolean }

export async function searchFilms(query: string, by: FilmSearchBy): Promise<FilmSearchResponse> {
  const q = query.trim();
  if (!q) return { films: [], by };
  const res = await fetch(`/api/references/films?q=${encodeURIComponent(q)}&by=${by}`);
  if (!res.ok) return { films: [], by, unavailable: true };
  return res.json();
}
