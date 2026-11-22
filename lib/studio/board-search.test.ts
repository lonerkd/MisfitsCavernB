import { describe, expect, it } from 'vitest';
import { highlightSegments, matchCards, matchLabel, queryWords, readingOrder, stepMatch, type SearchableCard } from './board-search';
import { sharedSlides, stepSlide, toSlides } from './board-slides';

const card = (id: string, x: number, y: number, note: string | null, media: SearchableCard['media'] = null): SearchableCard => ({ id, x, y, note, media });
const cards: SearchableCard[] = [
  card('c', 50, 10, 'Wet hair, always'),
  card('a', 5, 10, null, { title: 'Rain on glass', kind: 'image', notes: 'By Ana Pérez · via Openverse', board: 'weather', external_url: 'https://www.example.com/rain' }),
  card('b', 5, 60, 'Neon in the rain'),
  card('d', 30, 10, null, { title: 'Dusk', kind: 'video', notes: null, board: null, external_url: null }),
];

describe('board search', () => {
  it('splits a query into folded words', () => { expect(queryWords('  Rain  PÉREZ ')).toEqual(['rain', 'perez']); expect(queryWords('   ')).toEqual([]); });
  it('reads top to bottom, then left to right', () => { expect(readingOrder(cards).map((c) => c.id)).toEqual(['a', 'd', 'c', 'b']); });
  it('an empty query is not a search', () => { expect(matchCards(cards, ' ')).toEqual({ active: false, matches: [] }); });
  it('finds note text and titles, in reading order', () => { expect(matchCards(cards, 'rain').matches.map((m) => m.id)).toEqual(['a', 'b']); });
  it('finds a credit, a tag, a source and a kind; accents and case do not matter', () => {
    expect(matchCards(cards, 'PEREZ').matches.map((m) => m.id)).toEqual(['a']);
    expect(matchCards(cards, 'weather').matches[0].fields[0].field).toBe('tag');
    expect(matchCards(cards, 'example.com').matches.map((m) => m.id)).toEqual(['a']);
    expect(matchCards(cards, 'video').matches.map((m) => m.id)).toEqual(['d']);
  });
  it('every word must match somewhere on the card', () => {
    expect(matchCards(cards, 'rain glass').matches.map((m) => m.id)).toEqual(['a']);
    expect(matchCards(cards, 'rain nothing').matches).toEqual([]);
  });
  it('marks the matching pieces and the pieces join back into the text', () => {
    const seg = highlightSegments('Wet hair, always wet', 'wet');
    expect(seg.filter((s) => s.hit).map((s) => s.text)).toEqual(['Wet', 'wet']);
    expect(seg.map((s) => s.text).join('')).toBe('Wet hair, always wet');
    expect(highlightSegments('Pérez', 'perez')).toEqual([{ text: 'Pérez', hit: true }]);
    expect(highlightSegments('nothing', '')).toEqual([{ text: 'nothing', hit: false }]);
    expect(highlightSegments('', 'a')).toEqual([]);
  });
  it('steps through matches and wraps', () => {
    expect(stepMatch(-1, 3, 1)).toBe(0); expect(stepMatch(-1, 3, -1)).toBe(2);
    expect(stepMatch(2, 3, 1)).toBe(0); expect(stepMatch(0, 3, -1)).toBe(2); expect(stepMatch(0, 0, 1)).toBe(-1);
  });
  it('says what it found', () => {
    expect(matchLabel('', 0, -1)).toBe(''); expect(matchLabel('x', 0, -1)).toBe('No matches');
    expect(matchLabel('x', 1, 0)).toBe('1 of 1 match'); expect(matchLabel('x', 4, -1)).toBe('4 matches');
  });
});

describe('board slides', () => {
  it('one slide per card in reading order: images, notes, and the rest as a title with an open link', () => {
    const slides = toSlides([
      { id: 'n', x: 50, y: 10, note: 'Wet hair', media: null, src: null },
      { id: 'i', x: 5, y: 10, note: null, media: { kind: 'image', title: 'Rain', notes: ' By Ana ', external_url: null }, src: 'https://x/rain.jpg' },
      { id: 'v', x: 5, y: 70, note: null, media: { kind: 'video', title: '', external_url: 'https://youtu.be/x' }, src: null },
      { id: 'gone', x: 80, y: 70, note: null, media: null, src: null },
    ]);
    expect(slides.map((s) => s.id)).toEqual(['i', 'n', 'v', 'gone']);
    expect(slides[0]).toMatchObject({ kind: 'image', src: 'https://x/rain.jpg', caption: 'By Ana' });
    expect(slides[1]).toMatchObject({ kind: 'note', text: 'Wet hair' });
    expect(slides[2]).toMatchObject({ kind: 'link', label: 'Video', href: 'https://youtu.be/x', title: 'Untitled' });
    expect(slides[3].kind).toBe('note');
  });
  it('a shared board becomes slides from only what the loader returned', () => {
    const slides = sharedSlides({ items: [{ id: '1', x: 0, y: 0, w: 20, z: 0, note: null, media: { id: 'm', kind: 'image', title: 'Rain', storage_path: 'p/1.jpg', external_url: null, mime_type: null, width: null, height: null } }] }, { 'p/1.jpg': 'https://signed/1' });
    expect(slides).toEqual([{ id: '1', kind: 'image', title: 'Rain', src: 'https://signed/1', caption: undefined }]);
  });
  it('steps stay inside the slides', () => { expect(stepSlide(0, 3, -1)).toBe(0); expect(stepSlide(2, 3, 1)).toBe(2); expect(stepSlide(1, 3, 1)).toBe(2); expect(stepSlide(0, 0, 1)).toBe(0); });
});
