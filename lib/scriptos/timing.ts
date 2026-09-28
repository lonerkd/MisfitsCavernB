// Page count and runtime, the way the industry measures them: a screenplay
// page is 55 lines of 12-pt Courier, each element wraps at its own width
// (dialogue is narrow, action is wide), and a page runs about a minute. The
// word-count guesses this replaces (words ÷ 185 for pages, × 0.8 for minutes,
// words ÷ 190 for scene eighths) ignored layout entirely — a page of rapid
// dialogue and a page of dense action counted very differently.
//
// A table read measures the truth: scenes that have been read use their read
// time, and the rest are scaled by how the read ones compared to estimate.

export interface TimedLine { type: string; text: string }

export const LINES_PER_PAGE = 55;
export const DEFAULT_SECONDS_PER_PAGE = 60;

/** Characters per printed line for each element (standard screenplay margins). */
const WIDTH: Record<string, number> = {
  slug: 57, action: 60, shot: 60, character: 38, parenthetical: 25, dialogue: 35,
  transition: 20, centered: 40, lyric: 35,
};
/** Elements that don't print in the script. */
const SILENT = new Set(['section', 'synopsis', 'note', 'title', 'pagebreak', 'boneyard']);

/** How many printed lines `text` takes at `width` characters (greedy word wrap). */
export function wrappedLines(text: string, width: number): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 1;
  let lines = 1;
  let used = 0;
  for (const w of words) {
    const len = Math.min(w.length, width);
    if (used === 0) used = len;
    else if (used + 1 + len <= width) used += 1 + len;
    else { lines += 1; used = len; }
  }
  return lines;
}

/** Printed lines for a run of script lines; runs of blank lines count once. */
export function printedLines(lines: TimedLine[]): number {
  let total = 0;
  let prevBlank = false;
  for (const l of lines) {
    if (SILENT.has(l.type)) continue;
    const blank = l.type === 'empty' || !l.text.trim();
    if (blank) { if (!prevBlank) total += 1; prevBlank = true; continue; }
    prevBlank = false;
    total += wrappedLines(l.text, WIDTH[l.type] ?? WIDTH.action);
  }
  return total;
}

/** A scene's length in eighths of a page — the unit schedules use — never less than 1/8. */
export function eighthsOf(lines: TimedLine[]): number {
  return Math.max(1, Math.round((printedLines(lines) / LINES_PER_PAGE) * 8));
}

export interface SceneTiming {
  index: number;
  heading: string;
  /** Index of the scene's heading in the script's lines. */
  start: number;
  lines: number;
  eighths: number;
  /** pages × seconds per page. */
  estimate: number;
  /** Measured at a table read, if any. */
  read: number | null;
  /** read if measured, else estimate × the calibration factor. */
  runtime: number;
  dialogueShare: number;
}

export interface ScriptTiming {
  /** Printed pages (fractional). */
  pages: number;
  scenes: SceneTiming[];
  /** Before the first scene heading (title, FADE IN:). */
  preambleLines: number;
  /** Read time ÷ estimate over the scenes that have been read (1 when none). */
  calibration: number;
  readScenes: number;
  runtime: number;
  estimate: number;
}

/**
 * Timing for a whole script. `reads[i]` is scene i's measured table-read time
 * in seconds (null when not read); `secondsPerPage` is the project's pace.
 */
export function timeScript(lines: TimedLine[], reads: Array<number | null | undefined> = [], secondsPerPage = DEFAULT_SECONDS_PER_PAGE): ScriptTiming {
  const starts: number[] = [];
  lines.forEach((l, i) => { if (l.type === 'slug') starts.push(i); });
  const preambleLines = printedLines(lines.slice(0, starts[0] ?? lines.length));

  const scenes: SceneTiming[] = starts.map((start, index) => {
    const end = starts[index + 1] ?? lines.length;
    const body = lines.slice(start, end);
    const printed = printedLines(body);
    const dialogue = printedLines(body.filter((l) => l.type === 'dialogue' || l.type === 'parenthetical' || l.type === 'character'));
    const estimate = (printed / LINES_PER_PAGE) * secondsPerPage;
    const read = reads[index];
    return {
      index, start, heading: lines[start].text.trim(), lines: printed,
      eighths: Math.max(1, Math.round((printed / LINES_PER_PAGE) * 8)),
      estimate, read: typeof read === 'number' && read > 0 ? read : null, runtime: estimate,
      dialogueShare: printed ? dialogue / printed : 0,
    };
  });

  const measured = scenes.filter((s) => s.read != null && s.estimate > 0);
  const est = measured.reduce((n, s) => n + s.estimate, 0);
  const got = measured.reduce((n, s) => n + (s.read ?? 0), 0);
  // Guard against a nonsense factor from a sliver of a read.
  const calibration = est > 0 ? Math.min(3, Math.max(0.33, got / est)) : 1;
  for (const s of scenes) s.runtime = s.read ?? s.estimate * calibration;

  const totalLines = preambleLines + scenes.reduce((n, s) => n + s.lines, 0);
  return {
    pages: totalLines / LINES_PER_PAGE,
    scenes,
    preambleLines,
    calibration,
    readScenes: measured.length,
    runtime: scenes.reduce((n, s) => n + s.runtime, 0) + (preambleLines / LINES_PER_PAGE) * secondsPerPage,
    estimate: scenes.reduce((n, s) => n + s.estimate, 0) + (preambleLines / LINES_PER_PAGE) * secondsPerPage,
  };
}

export interface CharacterTiming {
  name: string;
  /** Dialogue blocks (times the character speaks). */
  speeches: number;
  words: number;
  scenes: number;
  firstScene: number;
  /** Seconds of dialogue at `wordsPerMinute`. */
  talkTime: number;
}

/** Who speaks, how much, in how many scenes — from character cues and their dialogue. */
export function timeCharacters(lines: TimedLine[], wordsPerMinute = 150): CharacterTiming[] {
  const by = new Map<string, CharacterTiming & { sceneSet: Set<number> }>();
  let scene = -1;
  let speaker: string | null = null;
  for (const l of lines) {
    if (l.type === 'slug') { scene += 1; speaker = null; continue; }
    if (l.type === 'character') {
      speaker = l.text.replace(/\(.*?\)/g, '').replace(/\^$/, '').trim().toUpperCase();
      if (!speaker) continue;
      let c = by.get(speaker);
      if (!c) { c = { name: speaker, speeches: 0, words: 0, scenes: 0, firstScene: Math.max(0, scene), talkTime: 0, sceneSet: new Set() }; by.set(speaker, c); }
      c.speeches += 1;
      c.sceneSet.add(scene);
      continue;
    }
    if (l.type === 'dialogue' && speaker) by.get(speaker)!.words += l.text.trim().split(/\s+/).filter(Boolean).length;
    else if (l.type !== 'parenthetical') speaker = null;
  }
  return Array.from(by.values())
    .map(({ sceneSet, ...c }) => ({ ...c, scenes: sceneSet.size, talkTime: (c.words / wordsPerMinute) * 60 }))
    .sort((a, b) => b.words - a.words || a.firstScene - b.firstScene);
}

/** 5025 s → "1h 24m"; 95 → "1m 35s". */
export function formatRuntime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m) return `${m}m ${String(s % 60).padStart(2, '0')}s`;
  return `${s}s`;
}

/** 11 eighths → "1 3/8"; 4 → "4/8". */
export function formatEighths(eighths: number): string {
  const whole = Math.floor(eighths / 8);
  const rest = eighths % 8;
  if (!whole) return `${rest}/8`;
  return rest ? `${whole} ${rest}/8` : `${whole}`;
}
