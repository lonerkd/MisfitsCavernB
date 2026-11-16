// What a brief option means for the rest of the suite, as plain inputs an admin
// can fill in and this file can check: `implies` (roles, breakdown categories,
// Lounge channels, a shooting pace), `detect` (how ScriptOS finds the option in
// a script) and a question's `ask_when` (only for some formats, or after an
// earlier answer). Pure: no database. The shapes are the ones
// lib/brief/core.ts and lib/brief/parsers.ts read.

import type { BriefOption, BriefQuestion } from './core';

/** The names an `implies` may point at; a list left out is not checked against the catalogue. */
export interface RuleVocab {
  crafts?: string[];
  channels?: string[];
  formats?: string[];
}

export interface OptionRulesDraft {
  crafts: string;
  breakdown: string;
  channels: string;
  pagesPerDay: string;
  words: string;
  nightExteriors: boolean;
  agesUnder: string;
}

export interface AskWhenDraft {
  formats: string;
  notFormats: string;
  /** One line per earlier question: `question_key: option, option`. */
  answer: string;
}

export type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

const MAX_ITEMS = 40;
const BREAKDOWN_KEY = /^[a-z0-9_-]{1,40}$/;

/** "a, b ,c" or one per line → trimmed, de-duplicated, empties dropped. */
export function splitList(text: string): string[] {
  return [...new Set(text.split(/[,\n]/).map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean))];
}

export function draftFromOption(o: BriefOption): OptionRulesDraft {
  return {
    crafts: (o.implies?.crafts ?? []).join(', '),
    breakdown: (o.implies?.breakdown ?? []).join(', '),
    channels: (o.implies?.channels ?? []).join(', '),
    pagesPerDay: o.implies?.pages_per_day != null ? String(o.implies.pages_per_day) : '',
    words: (o.detect?.words ?? []).join(', '),
    nightExteriors: o.detect?.night_exteriors === true,
    agesUnder: o.detect?.ages_under != null ? String(o.detect.ages_under) : '',
  };
}

function unknown(label: string, found: string[], known?: string[]): string | null {
  if (!known) return null;
  const bad = found.filter((f) => !known.some((k) => k.toLowerCase() === f.toLowerCase()));
  return bad.length ? `Unknown ${label}: ${bad.join(', ')}.` : null;
}

/** Put names in the catalogue's own spelling ("gaffer" → "Gaffer"). */
function canon(found: string[], known?: string[]): string[] {
  return found.map((f) => known?.find((k) => k.toLowerCase() === f.toLowerCase()) ?? f);
}

/** The option with its rules replaced by what the draft says (id, label and hint are kept). */
export function checkOptionRules(option: BriefOption, d: OptionRulesDraft, vocab: RuleVocab = {}): Checked<BriefOption> {
  const crafts = splitList(d.crafts);
  const breakdown = splitList(d.breakdown).map((b) => b.toLowerCase());
  const channels = splitList(d.channels).map((c) => c.toLowerCase());
  const words = splitList(d.words).map((w) => w.toLowerCase());
  for (const [what, list] of [['roles', crafts], ['breakdown categories', breakdown], ['channels', channels], ['words', words]] as const) {
    if (list.length > MAX_ITEMS) return { ok: false, error: `“${option.label}”: at most ${MAX_ITEMS} ${what}.` };
    if (list.some((s) => s.length > 60)) return { ok: false, error: `“${option.label}”: each of the ${what} is under 60 characters.` };
  }
  const bad = breakdown.find((b) => !BREAKDOWN_KEY.test(b));
  if (bad) return { ok: false, error: `“${option.label}”: “${bad}” is not a breakdown category key (lowercase letters, digits, - and _).` };
  const unknownMsg = unknown('roles', crafts, vocab.crafts) ?? unknown('channels', channels, vocab.channels);
  if (unknownMsg) return { ok: false, error: `“${option.label}”: ${unknownMsg}` };

  let pages: number | undefined;
  if (d.pagesPerDay.trim() !== '') {
    pages = Number(d.pagesPerDay);
    if (!Number.isFinite(pages) || pages <= 0 || pages > 50) return { ok: false, error: `“${option.label}”: pages per day is a number above 0 and up to 50.` };
  }
  let age: number | undefined;
  if (d.agesUnder.trim() !== '') {
    age = Number(d.agesUnder);
    if (!Number.isInteger(age) || age < 1 || age > 99) return { ok: false, error: `“${option.label}”: the age is a whole number from 1 to 99.` };
  }

  const implies: NonNullable<BriefOption['implies']> = {};
  if (crafts.length) implies.crafts = canon(crafts, vocab.crafts);
  if (breakdown.length) implies.breakdown = breakdown;
  if (channels.length) implies.channels = channels;
  if (pages != null) implies.pages_per_day = pages;
  const detect: NonNullable<BriefOption['detect']> = {};
  if (words.length) detect.words = words;
  if (d.nightExteriors) detect.night_exteriors = true;
  if (age != null) detect.ages_under = age;

  const { implies: _i, detect: _d, ...rest } = option;
  void _i; void _d;
  return { ok: true, value: { ...rest, ...(Object.keys(implies).length ? { implies } : {}), ...(Object.keys(detect).length ? { detect } : {}) } };
}

export function draftFromAskWhen(w: BriefQuestion['ask_when'] | null | undefined): AskWhenDraft {
  return {
    formats: (w?.formats ?? []).join(', '),
    notFormats: (w?.not_formats ?? []).join(', '),
    answer: Object.entries(w?.answer ?? {}).map(([k, ids]) => `${k}: ${ids.join(', ')}`).join('\n'),
  };
}

/** `ask_when` from the draft. A question cannot depend on itself, and the earlier question and its options must exist. */
export function checkAskWhen(d: AskWhenDraft, questions: BriefQuestion[], selfKey: string, vocab: RuleVocab = {}): Checked<BriefQuestion['ask_when']> {
  const formats = canon(splitList(d.formats), vocab.formats);
  const notFormats = canon(splitList(d.notFormats), vocab.formats);
  const badFormat = unknown('formats', formats, vocab.formats) ?? unknown('formats', notFormats, vocab.formats);
  if (badFormat) return { ok: false, error: badFormat };
  if (formats.some((f) => notFormats.includes(f))) return { ok: false, error: 'A format cannot be both asked and not asked.' };

  const answer: Record<string, string[]> = {};
  for (const raw of d.answer.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const at = raw.indexOf(':');
    if (at < 1) return { ok: false, error: `“${raw}”: write it as question_key: option, option.` };
    const key = raw.slice(0, at).trim();
    const ids = splitList(raw.slice(at + 1));
    if (key === selfKey) return { ok: false, error: 'A question cannot depend on its own answer.' };
    const other = questions.find((q) => q.key === key);
    if (!other) return { ok: false, error: `No question has the key “${key}”.` };
    if (!ids.length) return { ok: false, error: `Name at least one option of “${key}”.` };
    const missing = ids.filter((id) => !other.options.some((o) => o.id === id));
    if (missing.length) return { ok: false, error: `“${key}” has no option ${missing.join(', ')} (it has ${other.options.map((o) => o.id).join(', ') || 'none'}).` };
    answer[key] = ids;
  }

  const out: BriefQuestion['ask_when'] = {};
  if (formats.length) out.formats = formats;
  if (notFormats.length) out.not_formats = notFormats;
  if (Object.keys(answer).length) out.answer = answer;
  return { ok: true, value: out };
}

/** The words of a question: label 1–120, hint up to 300 (the database's limits). */
export function checkWords(label: string, hint: string): Checked<{ label: string; hint: string }> {
  const l = label.trim().replace(/\s+/g, ' ');
  const h = hint.trim();
  if (!l) return { ok: false, error: 'Give the question some words.' };
  if (l.length > 120) return { ok: false, error: 'Keep the question under 120 characters.' };
  if (h.length > 300) return { ok: false, error: 'Keep the hint under 300 characters.' };
  return { ok: true, value: { label: l, hint: h } };
}
