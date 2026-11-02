import { describe, expect, it } from 'vitest';
import { readHeading } from './heading';

describe('readHeading: a place stays one place, and the when is kept', () => {
  it('a plain heading', () => {
    expect(readHeading('HARBOR - NIGHT')).toMatchObject({ location: 'HARBOR', place: 'HARBOR', qualifiers: [], years: [], marker: null, frame: null });
  });
  it('double hyphens, a city, a time and a year', () => {
    expect(readHeading('DOCK OFFICE -- HARBOR TOWN -- NIGHT (1964)')).toMatchObject({
      location: 'DOCK OFFICE - HARBOR TOWN', place: 'DOCK OFFICE', qualifiers: ['HARBOR TOWN'], years: [1964], era: '1964',
    });
  });
  it('the same place at different hours and years is the same location string', () => {
    const a = readHeading("MARA'S FLAT -- NIGHT");
    const b = readHeading("MARA'S FLAT -- NIGHT (LATE 1972)");
    const c = readHeading("MARA'S FLAT -- LATER");
    expect(b.location).toBe(a.location);
    expect(c.location).toBe(a.location);
    expect(b).toMatchObject({ years: [1972], era: 'LATE 1972' });
    expect(c.marker).toBe('LATER');
  });
  it('a story told in layers: the layer tag is kept, not mistaken for the place', () => {
    expect(readHeading('RADIO STUDIO -- THE BOOTH -- NIGHT (PART FOUR, LATER)')).toMatchObject({ location: 'RADIO STUDIO - THE BOOTH', frame: 'PART FOUR, LATER', years: [] });
    expect(readHeading('RADIO STUDIO -- MAKEUP -- NIGHT (CHAPTER 2)')).toMatchObject({ location: 'RADIO STUDIO - MAKEUP', frame: 'CHAPTER 2' });
  });
  it('a time of day with a qualifier is a time of day, not a marker; a layer tag without brackets is still a layer', () => {
    expect(readHeading('CAFÉ -- LATE AFTERNOON')).toMatchObject({ location: 'CAFÉ', marker: null });
    expect(readHeading('STUDIO -- EARLY EVENING').marker).toBeNull();
    expect(readHeading('RADIO STUDIO -- THE BOOTH -- NIGHT -- PART FIVE, LATER')).toMatchObject({ location: 'RADIO STUDIO - THE BOOTH', frame: 'PART FIVE, LATER', marker: null });
  });
  it('continuity markers are kept as markers', () => {
    expect(readHeading("MARA'S FLAT -- THE SAME NIGHT").marker).toBe('THE SAME NIGHT');
    expect(readHeading("TESSA AND JONAS'S HOUSE -- NIGHT -- DAYS LATER")).toMatchObject({ location: "TESSA AND JONAS'S HOUSE", marker: 'DAYS LATER' });
    expect(readHeading("TESSA AND JONAS'S HOUSE -- EVENING (THREE WEEKS LATER)")).toMatchObject({ location: "TESSA AND JONAS'S HOUSE", marker: 'THREE WEEKS LATER' });
    expect(readHeading('NIGHT MARKET -- ALLEY -- EARLIER THAT NIGHT')).toMatchObject({ location: 'NIGHT MARKET - ALLEY', marker: 'EARLIER THAT NIGHT' });
    expect(readHeading('DOCK OFFICE -- HARBOR TOWN -- LATE NIGHT (1961) -- MINUTES EARLIER')).toMatchObject({ location: 'DOCK OFFICE - HARBOR TOWN', years: [1961], marker: 'MINUTES EARLIER' });
  });
  it('months and years together; a weekday is a when, not a place', () => {
    expect(readHeading('HARBOR AGENCY -- MORNING (NOVEMBER 1972)')).toMatchObject({ location: 'HARBOR AGENCY', years: [1972], era: 'NOVEMBER 1972' });
    expect(readHeading('MILL STREET -- HARBOR TOWN -- SUNDAY (1960)')).toMatchObject({ location: 'MILL STREET - HARBOR TOWN', years: [1960] });
  });
  it('a place whose name contains a time word stays a place', () => {
    expect(readHeading('NIGHT CLUB -- DAY').location).toBe('NIGHT CLUB');
    expect(readHeading('LATE NIGHT DINER').location).toBe('LATE NIGHT DINER');
    expect(readHeading('DAWN PATROL OFFICE -- MORNING').location).toBe('DAWN PATROL OFFICE');
  });
  it('a heading that is only a time keeps something as its place', () => {
    expect(readHeading('CONTINUOUS').location).toBe('CONTINUOUS');
  });
});
