import { describe, expect, it } from 'vitest';
import { buildFilmsQuery, filmNotes, isEntityId, parseFilms } from './films';

const row = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));

describe('buildFilmsQuery', () => {
  it('searches films by title through candidate ids', () => {
    const q = buildFilmsQuery('title', ['Q1', 'Q22']);
    expect(q).toContain('VALUES ?film { wd:Q1 wd:Q22 }');
  });
  it('searches by director or cinematographer through the person', () => {
    expect(buildFilmsQuery('director', ['Q5'])).toContain('?film wdt:P57 ?person');
    expect(buildFilmsQuery('cinematographer', ['Q5'])).toContain('?film wdt:P344 ?person');
  });
  it('lets only well-formed entity ids into the query', () => {
    const q = buildFilmsQuery('title', ['Q1', 'Q2} DROP', 'x', 'Q03', '']);
    expect(q).toContain('wd:Q1');
    expect(q).not.toContain('DROP');
    expect(() => buildFilmsQuery('title', ['nope'])).toThrow();
    expect(isEntityId('Q42')).toBe(true);
    expect(isEntityId('Q0')).toBe(false);
  });
  it('caps the number of rows asked for', () => {
    expect(buildFilmsQuery('title', ['Q1'], 9999)).toMatch(/LIMIT 480$/);
  });
});

describe('parseFilms', () => {
  const json = {
    results: {
      bindings: [
        row({ film: 'http://www.wikidata.org/entity/Q100', filmLabel: 'Blade Runner 2049', year: '2017', directorLabel: 'Denis Villeneuve', dpLabel: 'Roger Deakins', genreLabel: 'science fiction film', article: 'https://en.wikipedia.org/wiki/Blade_Runner_2049', filmDescription: '2017 film' }),
        row({ film: 'http://www.wikidata.org/entity/Q100', filmLabel: 'Blade Runner 2049', year: '2017', directorLabel: 'Denis Villeneuve', dpLabel: 'Roger Deakins', genreLabel: 'neo-noir' }),
        row({ film: 'http://www.wikidata.org/entity/Q200', filmLabel: '1917', year: '2019', dpLabel: 'Roger Deakins' }),
        row({ film: 'http://www.wikidata.org/entity/Q300', filmLabel: 'Q300' }),
        row({ film: 'not-an-entity', filmLabel: 'Bad' }),
      ],
    },
  };
  it('folds the rows of one film together and drops what cannot be shown', () => {
    const films = parseFilms(json);
    expect(films.map((f) => f.title)).toEqual(['1917', 'Blade Runner 2049']);
    const br = films[1];
    expect(br).toMatchObject({ year: 2017, directors: ['Denis Villeneuve'], cinematographers: ['Roger Deakins'], genres: ['science fiction film', 'neo-noir'], url: 'https://en.wikipedia.org/wiki/Blade_Runner_2049' });
    expect(films[0].url).toBe('https://www.wikidata.org/wiki/Q200');
  });
  it('reads an empty or odd answer as no films', () => {
    expect(parseFilms(null)).toEqual([]);
    expect(parseFilms({})).toEqual([]);
  });
  it('turns a film into notes with who made it and where it came from', () => {
    const notes = filmNotes(parseFilms(json)[1]);
    expect(notes).toContain('Blade Runner 2049 (2017)');
    expect(notes).toContain('Directed by Denis Villeneuve');
    expect(notes).toContain('Cinematography by Roger Deakins');
    expect(notes).toContain('Wikidata (CC0)');
  });
});
