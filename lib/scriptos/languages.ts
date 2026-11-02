// The language a speaker is written to speak in. A script can say it on the cue — `ABUELA (Spanish)`,
// `MARA (sings, Portuguese)`, `VOICE (V.O.) (Spanish, muffled)` — or on a line of its own inside the speech
// (`(in French)`). Pure. Only names this list knows count: `(soft)`, `(beat)` and `(O.S.)` are not languages.

const ALIASES: Record<string, string> = {
  creole: 'Creole', 'haitian creole': 'Creole', kreyol: 'Creole', 'kreyòl': 'Creole', 'haitian': 'Creole',
  french: 'French', francais: 'French', 'français': 'French',
  english: 'English', spanish: 'Spanish', español: 'Spanish', portuguese: 'Portuguese', italian: 'Italian', german: 'German', dutch: 'Dutch',
  arabic: 'Arabic', hebrew: 'Hebrew', hindi: 'Hindi', urdu: 'Urdu', bengali: 'Bengali', punjabi: 'Punjabi', tamil: 'Tamil',
  mandarin: 'Mandarin', cantonese: 'Cantonese', chinese: 'Chinese', japanese: 'Japanese', korean: 'Korean', vietnamese: 'Vietnamese', thai: 'Thai',
  tagalog: 'Tagalog', filipino: 'Tagalog', indonesian: 'Indonesian', malay: 'Malay', russian: 'Russian', ukrainian: 'Ukrainian', polish: 'Polish', czech: 'Czech',
  greek: 'Greek', turkish: 'Turkish', persian: 'Persian', farsi: 'Persian', swahili: 'Swahili', yoruba: 'Yoruba', igbo: 'Igbo', hausa: 'Hausa', zulu: 'Zulu', xhosa: 'Xhosa',
  amharic: 'Amharic', somali: 'Somali', wolof: 'Wolof', lingala: 'Lingala', twi: 'Twi', latin: 'Latin', irish: 'Irish', gaelic: 'Gaelic', welsh: 'Welsh',
  'asl': 'Sign language', 'bsl': 'Sign language', 'sign language': 'Sign language', signing: 'Sign language',
};

const canon = (token: string): string | null => {
  const t = token.trim().toLowerCase().replace(/^in\s+/, '').replace(/[.!]+$/, '');
  return ALIASES[t] ?? null;
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
