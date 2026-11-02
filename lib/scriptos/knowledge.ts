// What a script knows about itself, gathered from how it was read (BACKLOG 3.21 "the reader keeps more"). Pure:
// the parse result in, a plain summary out. Nothing here is guessed from the story; every figure comes from
// something the script wrote: a language on a cue, a year or a layer tag in a heading, the places it names.

import type { ParseResult } from './types';
import { languagesIn } from './languages';

export interface LanguageUse {
  language: string;
  speeches: number;
  words: number;
  /** 1-based scene numbers (position in the script) where it is spoken. */
  scenes: number[];
  speakers: string[];
}

export interface ScriptKnowledge {
  /** Languages the script tags, most spoken first. Speeches with no tag are counted separately (the script's own language). */
  languages: LanguageUse[];
  untaggedSpeeches: number;
  /** Who speaks what: the characters that speak any tagged language. */
  speakerLanguages: Array<{ name: string; languages: string[] }>;
  /** Years the headings name and how many scenes are set in each, in order. */
  eras: Array<{ year: number; scenes: number }>;
  /** Layers of a story told in layers ("PART ONE"), with the scenes in each. */
  frames: Array<{ frame: string; scenes: number[] }>;
  /** Places by how many scenes are set there, then by how many distinct qualifiers (cities, rooms) they have. */
  places: Array<{ place: string; scenes: number; qualifiers: string[] }>;
  /** How many times the story jumps back in time between two dated scenes. */
  timeJumpsBack: number;
}

const wordCount = (s: string) => (s.trim().match(/\S+/g) ?? []).length;

export function scriptKnowledge(read: Pick<ParseResult, 'lines' | 'scenes'>): ScriptKnowledge {
  const byLang = new Map<string, { speeches: number; words: number; scenes: Set<number>; speakers: Set<string> }>();
  const speakerLangs = new Map<string, Set<string>>();
  let untagged = 0;

  read.scenes.forEach((scene, si) => {
    let cue: { name: string; languages: string[]; words: number } | null = null;
    const close = () => {
      if (!cue) return;
      if (cue.languages.length === 0) untagged += 1;
      for (const language of cue.languages) {
        const u = byLang.get(language) ?? { speeches: 0, words: 0, scenes: new Set<number>(), speakers: new Set<string>() };
        u.speeches += 1; u.words += cue.words; u.scenes.add(si + 1); u.speakers.add(cue.name);
        byLang.set(language, u);
        const set = speakerLangs.get(cue.name) ?? new Set<string>();
        set.add(language);
        speakerLangs.set(cue.name, set);
      }
      cue = null;
    };
    for (let i = scene.startIndex; i <= scene.endIndex && i < read.lines.length; i++) {
      const l = read.lines[i];
      if (l.type === 'character') {
        close();
        cue = { name: String(l.meta?.characterName ?? l.text).trim(), languages: languagesIn(l.text), words: 0 };
      } else if (cue && l.type === 'parenthetical') {
        for (const lang of languagesIn(l.text)) if (!cue.languages.includes(lang)) cue.languages.push(lang);
      } else if (cue && l.type === 'dialogue') {
        cue.words += wordCount(l.text);
      } else if (cue && l.type !== 'empty') {
        close();
      }
    }
    close();
  });

  const languages = [...byLang].map(([language, u]) => ({ language, speeches: u.speeches, words: u.words, scenes: [...u.scenes].sort((a, b) => a - b), speakers: [...u.speakers].sort() }))
    .sort((a, b) => b.speeches - a.speeches || a.language.localeCompare(b.language));

  const eraCount = new Map<number, number>();
  const frames = new Map<string, number[]>();
  const places = new Map<string, { scenes: number; qualifiers: Set<string> }>();
  let timeJumpsBack = 0;
  let lastYear: number | null = null;
  read.scenes.forEach((scene, si) => {
    for (const y of scene.years ?? []) eraCount.set(y, (eraCount.get(y) ?? 0) + 1);
    if (scene.frame) frames.set(scene.frame, [...(frames.get(scene.frame) ?? []), si + 1]);
    const [place, ...qualifiers] = scene.location.split(' - ');
    if (place) {
      const p = places.get(place) ?? { scenes: 0, qualifiers: new Set<string>() };
      p.scenes += 1; qualifiers.forEach((q) => p.qualifiers.add(q));
      places.set(place, p);
    }
    const year = scene.years?.[0];
    if (year !== undefined) {
      if (lastYear !== null && year < lastYear) timeJumpsBack += 1;
      lastYear = year;
    }
  });

  return {
    languages,
    untaggedSpeeches: untagged,
    speakerLanguages: [...speakerLangs].map(([name, set]) => ({ name, languages: [...set] })).sort((a, b) => a.name.localeCompare(b.name)),
    eras: [...eraCount].map(([year, scenes]) => ({ year, scenes })).sort((a, b) => a.year - b.year),
    frames: [...frames].map(([frame, scenes]) => ({ frame, scenes })),
    places: [...places].map(([place, p]) => ({ place, scenes: p.scenes, qualifiers: [...p.qualifiers].sort() }))
      .sort((a, b) => b.scenes - a.scenes || b.qualifiers.length - a.qualifiers.length || a.place.localeCompare(b.place)),
    timeJumpsBack,
  };
}
