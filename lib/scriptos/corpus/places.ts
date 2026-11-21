// The places surface of the ratchet (B7b). Places the project knows (its Locations) are evidence about scene headings,
// but they must never change where scenes begin (the editor and the Studio would disagree), so what they move is not a
// label: it is which lines the review asks about. Here half the headings of a script are written the way a pasted or
// hurried script writes them, without INT./EXT. ("KITCHEN - NIGHT"), the truth is that every one of them is a scene
// heading, and the project knows the script's places. Measured: of those headings, how many the review offers as "could be
// a scene heading" (recall), how many of the lines it offers that way are headings (precision), and that the reading
// itself (the labels, the scenes) is exactly what it was without the places.

import { parseScript } from '../parser';
import { doubtfulReads } from '../review';
import { generateScript, type Style } from './generate';
import { renderText } from './render';
import { SEEDS } from './run';

export interface PlacesResult {
  /** True headings written without INT./EXT. */
  bare: number;
  /** Of them, offered by the review as a possible scene heading. */
  offered: number;
  /** Lines offered as a possible scene heading in all, and how many of those are headings. */
  flagged: number;
  flaggedRight: number;
  /** Seeded scripts whose labels or scenes differ with the places known (must be 0). */
  changedReads: number;
}

const PREFIX = /^(?:\d+[A-Z]?\.?\s+)?(INT\.\/EXT\.|INT\.|EXT\.)\s+/;

export function measurePlaces(style: Style, withPlaces: boolean, seeds = SEEDS): PlacesResult {
  const out: PlacesResult = { bare: 0, offered: 0, flagged: 0, flaggedRight: 0, changedReads: 0 };
  for (const seed of seeds) {
    const els = generateScript(seed, style);
    const places = [...new Set(els.filter((e) => e.type === 'slug').map((e) => e.text.replace(PREFIX, '').split(' - ')[0].trim()))];
    // Every second heading loses its INT./EXT.
    let k = 0;
    const edited = els.map((e) => (e.type === 'slug' && k++ % 2 === 1 ? { ...e, text: e.text.replace(PREFIX, '') } : e));
    const bareText = new Set(edited.filter((e, i) => e.type === 'slug' && e.text !== els[i].text).map((e) => e.text));
    const { text } = renderText(edited);
    const lines = text.replace(/\n$/, '').split('\n');
    const alone = parseScript(text);
    const read = parseScript(text, 'screenplay', undefined, withPlaces ? { context: { places } } : undefined);
    if (read.scenes.length !== alone.scenes.length || read.lines.some((l, i) => l.type !== alone.lines[i].type)) out.changedReads++;
    const offered = new Set(doubtfulReads(read.lines, { limit: 100000 }).filter((d) => d.alternative === 'slug').map((d) => d.index));
    lines.forEach((l, i) => { if (bareText.has(l.trim())) { out.bare++; if (offered.has(i)) out.offered++; } });
    for (const i of offered) { out.flagged++; if (bareText.has(lines[i].trim())) out.flaggedRight++; }
  }
  return out;
}
