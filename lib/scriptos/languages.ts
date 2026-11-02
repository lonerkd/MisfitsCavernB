// The language a speaker is written to speak in. A script can say it on the cue (`ABUELA (Spanish)`,
// `MARA (sings, Portuguese)`, `VOICE (V.O.) (Spanish, muffled)`, `JONAS (speaking Yiddish)`) or on a line of its own
// inside the speech (`(in Spanish)`). Pure.
//
// Which names count as languages is not a list I typed: it comes from the runtime's own locale data
// (`Intl.DisplayNames`), so every language it knows is recognised, by its English name and, for the two-letter
// codes, by its own name too ("español", "français"). A name on its own counts only when it is exactly a language:
// `(soft)`, `(beat)`, `(O.S.)` and `(Spanish accent)` do not. A name after "in", "speaking", "sings in" and the like
// counts even if it is one the data does not know, and is reported as written.

const SYNONYMS: Record<string, string> = {
  creole: 'Haitian Creole', 'haitian creole': 'Haitian Creole', kreyol: 'Haitian Creole', 'kreyòl': 'Haitian Creole', haitian: 'Haitian Creole',
  mandarin: 'Mandarin Chinese', 'mandarin chinese': 'Mandarin Chinese', cantonese: 'Cantonese', chinese: 'Chinese',
  farsi: 'Persian', filipino: 'Filipino', tagalog: 'Filipino', gaelic: 'Gaelic', 'scottish gaelic': 'Gaelic', 'sign language': 'Sign language',
  asl: 'Sign language', bsl: 'Sign language', signing: 'Sign language', 'american sign language': 'Sign language', 'british sign language': 'Sign language',
  spanglish: 'Spanglish', pidgin: 'Pidgin', patois: 'Patois', 'african american vernacular english': 'English', 'cockney': 'English',
};

let table: Map<string, string> | null = null;

/** Every language name the runtime knows, lower-cased, mapped to its English name. Built once, on first use. */
function names(): Map<string, string> {
  if (table) return table;
  const map = new Map<string, string>();
  try {
    const english = new Intl.DisplayNames(['en'], { type: 'language' });
    const add = (key: string, value: string) => { const k = key.trim().toLowerCase(); if (k && !map.has(k)) map.set(k, value); };
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const codes: string[] = [];
    for (const a of letters) for (const b of letters) codes.push(a + b);
    for (const a of letters) for (const b of letters) for (const c of letters) codes.push(a + b + c);
    for (const code of codes) {
      let name: string | undefined;
      try { name = english.of(code); } catch { continue; }
      if (!name || name.toLowerCase() === code || /^unknown|^und/i.test(name)) continue;
      add(name, name);
      if (code.length === 2) { // its own name for itself: "español", "français"
        try { const own = new Intl.DisplayNames([code], { type: 'language' }).of(code); if (own && own.toLowerCase() !== code) add(own, name); } catch { /* no data for this one */ }
      }
    }
  } catch { /* no Intl.DisplayNames: the synonyms below still work */ }
  for (const [k, v] of Object.entries(SYNONYMS)) map.set(k, v);
  table = map;
  return map;
}

const VERBS = /\b(?:in|speaking|speaks|spoken in|sings in|singing in|says in|reads in|replies in|answers in|switches to|into|translated from)\s+([\p{L}][\p{L}' -]*)$/iu;

const canon = (token: string): string | null => {
  const t = token.trim().replace(/[.!]+$/, '').replace(/\s+/g, ' ');
  if (!t) return null;
  const known = names();
  const lower = t.toLowerCase();
  const exact = known.get(lower) ?? known.get(lower.replace(/^in\s+/, ''));
  if (exact) return exact;
  const m = VERBS.exec(t);
  if (m) {
    const tail = m[1].trim().toLowerCase();
    // "in the kitchen" is not a language: after a verb of speaking only a word the data knows, or a single capitalised word, counts.
    const hit = known.get(tail);
    if (hit) return hit;
    if (/^\p{Lu}[\p{L}'-]*$/u.test(m[1].trim())) return m[1].trim();
  }
  return null;
};

/** Languages named in the brackets of a cue or of a parenthetical line, in the order written, once each. */
export function languagesIn(text: string): string[] {
  const found: string[] = [];
  for (const m of text.matchAll(/\(([^)]*)\)/g)) {
    for (const token of m[1].split(/[,;/&]|\band\b/i)) {
      const lang = canon(token);
      if (lang && !found.includes(lang)) found.push(lang);
    }
  }
  return found;
}
