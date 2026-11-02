// What a scene heading says, taken apart (the knowledge the reader keeps from it). Pure.
//
//   INT. DOCK OFFICE -- HARBOR TOWN -- NIGHT (1964)
//        └─ place ─┘ └─ city ──┘   └ time ┘└year┘
//
// A heading is a place, then anything that qualifies it (a city, a floor, "STAGE DOOR"), then WHEN: a time of
// day, a continuity marker ("CONTINUOUS", "THE SAME NIGHT", "TWO DAYS LATER"), a year or era in brackets
// ("(1964)", "(LATE 1962)", "(NOVEMBER 1962)") and sometimes a frame tag for a story told in layers
// ("(PART ONE)"). The place must be the same string every time the same place comes back, whatever the hour
// or year the scene is set in; the "when" parts are kept as data, not thrown away.

export interface Heading {
  /** The place and its qualifiers, joined with " - ": the same for every scene set there, whatever the time. */
  location: string;
  /** The first part: the place itself ("DOCK OFFICE"). */
  place: string;
  /** What follows it ("PARIS", "STAGE DOOR"). */
  qualifiers: string[];
  /** Calendar years named in the heading, in order ("(1964)" → 1964; "(LATE 1962)" → 1962). */
  years: number[];
  /** "LATE 1962", "NOVEMBER 1962": the words that came with the year. */
  era: string | null;
  /** "CONTINUOUS", "THE SAME NIGHT", "TWO DAYS LATER", "EARLIER THAT NIGHT": how this scene follows the one before. */
  marker: string | null;
  /** "PART ONE", "PART FOUR, LATER": which layer of a story told in layers this scene belongs to. */
  frame: string | null;
}

// Times of day, in English first and then the languages scripts are most often written in. This is a start, not a
// finished list: `scriptKnowledge` reports which trailing heading words it could not place, so a new script
// shows what is missing instead of someone guessing.
export const TIMES = new Set([
  'DAY', 'NIGHT', 'MORNING', 'AFTERNOON', 'EVENING', 'DAWN', 'DUSK', 'SUNRISE', 'SUNSET', 'MIDNIGHT', 'NOON',
  'EARLY MORNING', 'LATE NIGHT', 'MAGIC HOUR', 'TWILIGHT',
  // Spanish and Portuguese
  'DIA', 'DÍA', 'NOCHE', 'NOITE', 'MAÑANA', 'MANHÃ', 'TARDE', 'ATARDECER', 'AMANECER', 'ANOCHECER', 'MEDIANOCHE', 'MEDIODÍA', 'AMANHECER', 'ENTARDECER', 'MADRUGADA', 'FIM DE TARDE',
  // French
  'JOUR', 'NUIT', 'MATIN', 'SOIR', 'APRÈS-MIDI', 'APRES-MIDI', 'AUBE', 'CRÉPUSCULE', 'MINUIT', 'MIDI', 'SOIRÉE', 'MATINÉE',
  // German
  'TAG', 'NACHT', 'MORGEN', 'ABEND', 'NACHMITTAG', 'VORMITTAG', 'DÄMMERUNG', 'MITTERNACHT', 'MITTAG',
  // Italian
  'GIORNO', 'NOTTE', 'MATTINA', 'SERA', 'POMERIGGIO', 'ALBA', 'TRAMONTO', 'MEZZANOTTE',
]);
export const FILLER = new Set(['THE', 'THAT', 'THIS', 'SAME', 'NEXT', 'EARLY', 'LATE', 'EARLIER', 'LATER', 'LATER STILL', 'BEFORE', 'AFTER', 'OF', 'A', 'AN', 'TO', 'AT', 'IN', 'ON', 'SOON', 'THEN', 'MOMENTS', 'MINUTES', 'HOURS', 'DAYS', 'WEEKS', 'MONTHS', 'YEARS', 'SECONDS', 'WEEK', 'MONTH', 'YEAR', 'MINUTE', 'HOUR', 'SECOND', 'TIME', 'THAT WEEK', 'SIMULTANEOUS', 'MEANWHILE', 'CONTINUOUS', 'CONT\'D', 'FLASHBACK', 'PRESENT', 'PAST', 'FUTURE', 'DREAM SEQUENCE', 'DAYDREAM', 'NIGHTMARE', 'VARIOUS', 'ANOTHER', 'FOLLOWING', 'PREVIOUS']);
export const NUMBER_WORDS = new Set(['A', 'AM', 'PM', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'FEW', 'SEVERAL', 'MANY']);
export const MONTHS = new Set(['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER', 'SPRING', 'SUMMER', 'AUTUMN', 'FALL', 'WINTER']);
export const DAYS_OF_WEEK = new Set(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']);
/** A layer of a story told in layers: "PART ONE", "CHAPTER 2", "ACT THREE, LATER", "REEL 2". */
export const FRAME_TAG = /^(PART|CHAPTER|ACT|HOUR|REEL|TAPE|SEGMENT)\s+([A-Z]+|\d+)(\s*,\s*[A-Z][A-Z ]*)?$/i;
export const YEAR = /\b(1[0-9]{3}|20[0-9]{2})(?:'?s)?\b/g;
export const CLOCK = /^\d{1,2}[:.]\d{2}$/;

/** "LATE AFTERNOON", "EARLY EVENING", "MID-MORNING": a time of day with a qualifier. */
const isTimeOfDay = (joined: string): boolean => TIMES.has(joined) || TIMES.has(joined.replace(/^(LATE|EARLY|MID)\s+/, ''));

const words = (s: string) => s.toUpperCase().replace(/(\d)[:.](\d)/g, '$1:$2').replace(/[^\p{L}0-9'’:\s-]/gu, ' ').split(/\s+/).filter(Boolean);

/** Is every word of this part about WHEN (a time of day, a marker, a year), so that it is not part of the place? */
function isWhen(part: string): boolean {
  const w = words(part.replace(/\([^)]*\)/g, ' '));
  if (w.length === 0) return true; // nothing left but a bracketed tag: that is a "when" (or a frame)
  const joined = w.join(' ');
  if (isTimeOfDay(joined)) return true;
  // Phrases of several words in the vocabulary ("DREAM SEQUENCE", "LATER STILL") are taken out whole before the words are judged one by one.
  let rest = ` ${joined} `;
  for (const phrase of [...FILLER].filter((f) => f.includes(' ')).sort((a, b) => b.length - a.length)) rest = rest.split(` ${phrase} `).join(' ');
  const left = rest.trim() ? rest.trim().split(/\s+/) : [];
  return left.every((x) => TIMES.has(x) || FILLER.has(x) || NUMBER_WORDS.has(x) || MONTHS.has(x) || DAYS_OF_WEEK.has(x) || /^\d{4}S?$/.test(x) || /^\d+$/.test(x) || CLOCK.test(x));
}

/** The parts of a heading body, split on hyphens, double hyphens, en and em dashes. */
export const headingParts = (headingBody: string): string[] => headingBody.split(/\s+-{1,2}\s+|\s+[–—]\s+/).map((p) => p.trim()).filter(Boolean);

/**
 * "KITCHEN. DAY" and "KITCHEN, DAY, 1985": a time written after a full stop or a comma is a part of its own. Only a
 * trailing run that is all "when" is split off, so "ST. JOHN'S HOSPITAL" and "MR. SMITH'S, DAY CARE" stay whole.
 */
function peelPunctuated(part: string): string[] {
  if (FRAME_TAG.test(part)) return [part]; // "PART FIVE, LATER" is one layer tag
  const out: string[] = [];
  let rest = part;
  for (let guard = 0; guard < 4; guard++) {
    // The last full stop or comma that is not inside brackets and is followed by a space.
    let depth = 0;
    let at = -1;
    for (let i = 0; i < rest.length - 1; i++) {
      const c = rest[i];
      if (c === '(') depth++;
      else if (c === ')') depth = Math.max(0, depth - 1);
      else if ((c === '.' || c === ',') && depth === 0 && /\s/.test(rest[i + 1])) at = i;
    }
    if (at < 1) break;
    const left = rest.slice(0, at).trim();
    const right = rest.slice(at + 1).trim();
    if (!right || !isWhen(right) || !words(left).length) break;
    out.unshift(right);
    rest = left;
  }
  return [rest, ...out];
}

export function readHeading(headingBody: string): Heading {
  const parts = headingParts(headingBody).flatMap((p, i, all) => (i === all.length - 1 ? peelPunctuated(p) : [p]));
  const years: number[] = [];
  let era: string | null = null;
  let frame: string | null = null;
  const markers: string[] = [];
  const addYears = (text: string): boolean => {
    const ys = [...text.matchAll(YEAR)].map((m) => Number(m[1]));
    if (ys.length === 0) return false;
    years.push(...ys);
    era = era ?? text.replace(/\s+/g, ' ').trim().toUpperCase();
    return true;
  };
  const addMarker = (text: string) => { const t = text.replace(/\s+/g, ' ').trim().toUpperCase(); if (t && !markers.includes(t)) markers.push(t); };

  // Brackets anywhere in the heading carry a year, an era, a layer tag or a marker; take them out before judging what is place.
  const clean = (part: string): string => part.replace(/\(([^)]*)\)/g, (_all, inner: string) => {
    const text = String(inner).trim();
    if (FRAME_TAG.test(text)) { frame = frame ?? text.toUpperCase(); return ' '; }
    if (addYears(text)) return ' ';
    if (isWhen(text)) { addMarker(text); return ' '; }
    return `(${text})`; // a bracket that is about the place is kept as it was
  }).replace(/\s+/g, ' ').trim();

  const cleaned = parts.map(clean);
  const kept: string[] = [];
  cleaned.forEach((part, i) => {
    if (i > 0 && FRAME_TAG.test(part)) { frame = frame ?? part.toUpperCase(); return; } // a layer tag written without brackets
    if (i > 0 && isWhen(part)) {
      if (addYears(part)) {
        // "SUMMER 1985", "THE 1980s": the year is data; what is left of the words is a marker only if it says more than the year.
        const rest = words(part).filter((x) => !/^\d{4}S?$/.test(x) && !['THE', 'IN', 'OF', 'CIRCA', 'C', 'AROUND', 'LATE', 'EARLY', 'MID'].includes(x) && !MONTHS.has(x));
        if (rest.length) addMarker(rest.join(' '));
        return;
      }
      if (!isTimeOfDay(words(part).join(' ')) && part) addMarker(part);
      return;
    }
    if (part) kept.push(part);
  });
  if (kept.length === 0 && cleaned[0]) kept.push(cleaned[0]);
  return {
    location: kept.join(' - '),
    place: kept[0] ?? '',
    qualifiers: kept.slice(1),
    years: [...new Set(years)],
    era,
    marker: markers.length ? markers.join(', ') : null,
    frame,
  };
}
