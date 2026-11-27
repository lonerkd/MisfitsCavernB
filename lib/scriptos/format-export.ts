// Format-shaped exports for the formats whose readers are not screenwriters (BACKLOG 3.51 gap 2, 3.22):
// a video script prints as a shooting script — what the viewer sees beside what is said — and publishes as a
// package built only from the document's own words; an article prints and downloads as an article (a clean
// Markdown file, or the print kit's HTML) a blog platform can take as it is; a game script prints part by
// part as the beats it is built from and hands over as a build sheet (its structure, cast, script and jumps).
// Pure: the same script and the same day give the same files. Nothing here invents: chapter times a section
// does not carry are estimated from its spoken words and labelled estimates, tags come from the title and
// the section names alone, and a jump's target is the label the writer wrote, never resolved for them.
import { parseScript } from './parser';
import { readingFormat } from './reading-format';
import type { StoredScript } from './storage';
import { printHtml, type PrintBlock, type PrintDoc } from '@/lib/print/kit';

const wordCount = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;

/** Seconds as YouTube writes them: 0:45, 12:07, 1:02:31. */
export function timecode(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}

/** A spoken-word estimate of a video's length: people speak at about 150 words a minute. */
const SPEAKING_WPM = 150;

// ── Video script ─────────────────────────────────────────────────────────────

export interface VideoSection {
  title: string;
  /** The timestamp the section marker itself carries ("0:45 - SPONSOR"), when it carries one. */
  timestamp?: string;
  rows: Array<{ visual: string; spoken: string }>;
  spoken: string[];
}

const TIMESTAMP = /^(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]\s*(.+)$/;

/** The video script read as its sections: each section's on-screen cues and spoken lines, in the order written. */
export function videoSections(script: StoredScript): VideoSection[] {
  const lines = parseScript(script.content, readingFormat(script.format)).lines;
  const sections: VideoSection[] = [];
  let current: VideoSection | null = null;
  const open = (title: string, timestamp?: string): VideoSection => {
    current = { title, timestamp, rows: [], spoken: [] };
    sections.push(current);
    return current;
  };
  for (const line of lines) {
    const t = line.text.trim();
    if (!t || line.type === 'empty') continue;
    if (line.type === 'slug') {
      const m = t.match(TIMESTAMP);
      if (m) open(m[2].trim(), m[1]);
      else open(t);
      continue;
    }
    const sec = current ?? open('Opening');
    if (line.type === 'shot') {
      // An on-screen cue is written [like this]; the brackets are the notation, not the content.
      sec.rows.push({ visual: t.replace(/^\[/, '').replace(/\]$/, ''), spoken: '' });
    } else if (line.type === 'parenthetical') {
      // A delivery note belongs to the line it follows.
      const last = sec.rows[sec.rows.length - 1];
      if (last && last.spoken) last.spoken += `\n${t}`;
      else sec.rows.push({ visual: '', spoken: t });
    } else {
      sec.rows.push({ visual: '', spoken: t });
      sec.spoken.push(t);
    }
  }
  return sections;
}

/** The shooting-script print: one table per section, what the viewer sees in one column, what is said in the other. */
export function videoScriptDoc(script: StoredScript, generated: string, titleOverride?: string): PrintDoc {
  const sections = videoSections(script);
  const spokenWords = sections.reduce((n, s) => n + s.spoken.reduce((m, l) => m + wordCount(l), 0), 0);
  const blocks: PrintBlock[] = sections.map((s) => ({
    type: 'table',
    title: s.timestamp ? `${s.timestamp} — ${s.title}` : s.title,
    columns: [
      { key: 'visual', label: 'On screen', width: '38%' },
      { key: 'spoken', label: 'Spoken' },
    ],
    rows: s.rows,
    empty: 'Nothing written in this section yet.',
  }));
  if (!sections.length) blocks.push({ type: 'note', text: 'Nothing written yet.' });
  return {
    title: titleOverride || script.title || 'Untitled',
    kind: 'Video script',
    meta: [['Sections', sections.length], ['Spoken words', spokenWords], ['Estimated running time', timecode((spokenWords / SPEAKING_WPM) * 60)]],
    blocks,
    footer: script.title,
    generated,
  };
}

const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'your', 'you', 'how', 'what', 'why', 'is', 'it']);

/** Tags from the document alone: its section names (numbering stripped) and the long words of its title. */
function videoTags(title: string, sections: VideoSection[]): string[] {
  const tags: string[] = [];
  const add = (raw: string) => {
    const tag = raw.toLowerCase().replace(/[^a-z0-9' -]/g, '').replace(/\s+/g, ' ').trim();
    if (tag.length >= 3 && !tags.includes(tag)) tags.push(tag);
  };
  for (const s of sections) add(s.title.replace(/^(chapter|part|section)\s+\d+\s*[:.\-]?\s*/i, ''));
  for (const w of title.split(/\s+/)) if (!STOPWORDS.has(w.toLowerCase())) add(w);
  // YouTube allows 500 characters of tags in total.
  const out: string[] = [];
  let used = 0;
  for (const t of tags) { if (used + t.length + 2 > 480) break; out.push(t); used += t.length + 2; }
  return out;
}

/**
 * The publish package for a video script, as one Markdown file the creator pastes into YouTube Studio:
 * title options (the document's title, and the hook's own first line, labelled), a description excerpted
 * from the script's opening, the chapters (timestamps as written; the rest estimated from spoken words
 * and labelled estimates), and tags drawn from the title and section names. No wording is invented.
 */
export function videoPublishPackage(script: StoredScript, generated: string): string {
  const sections = videoSections(script);
  const title = script.title || 'Untitled';
  const out: string[] = [`# Publish package — ${title}`, '', `Made from the script as written, ${generated}. Everything below is the document's own words and structure.`];

  out.push('', '## Title options', '', `- ${title}`);
  const hook = sections.find((s) => /^(hook|cold open|teaser)/i.test(s.title)) ?? sections[0];
  const hookLine = hook?.spoken.find((l) => l.trim().length >= 10 && l.trim().length <= 90 && l.trim() !== title);
  if (hookLine) out.push(`- ${hookLine.trim()} (from your ${/^(hook|cold open|teaser)/i.test(hook.title) ? 'hook' : 'opening'})`);

  out.push('', '## Description', '');
  const opening = sections.slice(0, 2).flatMap((s) => s.spoken).join(' ').replace(/\s+/g, ' ').trim();
  if (opening) {
    out.push(opening.length > 400 ? `${opening.slice(0, opening.lastIndexOf(' ', 400))}…` : opening);
  } else out.push('The script has no spoken text yet.');

  const written = sections.filter((s) => s.timestamp);
  if (written.length) {
    out.push('', '## Chapters — timestamps written in the script', '');
    for (const s of written) out.push(`${s.timestamp} ${s.title}`);
  }

  out.push('', '## Chapters — estimated from the spoken words', '',
    'Estimated at about 150 spoken words a minute, counted from the start of the script. Check these against the final cut before pasting them into YouTube.', '');
  let elapsed = 0;
  for (const s of sections) {
    out.push(`${timecode(elapsed)} ${s.title}`);
    elapsed += (s.spoken.reduce((n, l) => n + wordCount(l), 0) / SPEAKING_WPM) * 60;
  }

  const tags = videoTags(title, sections);
  out.push('', '## Tags', '', tags.length ? tags.join(', ') : 'No tags yet — the title and section names are too short to draw any from.');
  out.push('');
  return out.join('\n');
}

// ── Prose / article ──────────────────────────────────────────────────────────

export interface ProseSection { heading?: string; blocks: PrintBlock[]; markdown: string[] }

const headingText = (raw: string, meta?: Record<string, unknown>): string =>
  (typeof meta?.heading === 'string' && meta.heading.trim()) || raw.replace(/^#+\s*/, '').trim();

/** The article read as its parts: a lead paragraph, headed sections, pull quotes set apart. */
export function proseParts(script: StoredScript): { lead?: string; sections: ProseSection[]; words: number } {
  const lines = parseScript(script.content, readingFormat(script.format)).lines;
  const sections: ProseSection[] = [];
  let current: ProseSection | null = null;
  let lead: string | undefined;
  let words = 0;
  const open = (heading?: string): ProseSection => {
    current = { heading, blocks: [], markdown: [] };
    sections.push(current);
    return current;
  };
  for (const line of lines) {
    const t = line.text.trim();
    if (!t || line.type === 'empty') continue;
    words += wordCount(t);
    if (line.type === 'slug') { open(headingText(t, line.meta)); continue; }
    const sec = current ?? open();
    if (line.type === 'dialogue') {
      // In prose the reader marks a quoted line as a pull quote.
      sec.blocks.push({ type: 'note', text: t });
      sec.markdown.push(`> ${t}`);
    } else {
      if (!lead && !sec.heading && !sections.slice(0, -1).length && sec.blocks.length === 0) lead = t;
      sec.blocks.push({ type: 'text', text: t });
      sec.markdown.push(t);
    }
  }
  return { lead, sections, words };
}

/** The article print: the opening paragraph as the lead, each heading a section, pull quotes set apart. */
export function proseArticleDoc(script: StoredScript, generated: string, titleOverride?: string): PrintDoc {
  const { lead, sections, words } = proseParts(script);
  const blocks: PrintBlock[] = [];
  if (lead) blocks.push({ type: 'text', text: lead, lead: true });
  for (const s of sections) {
    const inner = s.blocks.filter((b) => !(lead && b.type === 'text' && b.text === lead));
    if (!inner.length && !s.heading) continue;
    if (s.heading) blocks.push({ type: 'section', title: s.heading, blocks: inner });
    else blocks.push(...inner);
  }
  if (!blocks.length) blocks.push({ type: 'note', text: 'Nothing written yet.' });
  return {
    title: titleOverride || script.title || 'Untitled',
    kind: 'Article',
    meta: [['Words', words], ['Reading time', `${Math.max(1, Math.round(words / 200))} min`]],
    blocks,
    footer: script.title,
    generated,
  };
}

/** The publish-ready Markdown file: one title, the headings, the paragraphs, pull quotes as quotes. */
export function proseMarkdown(script: StoredScript, titleOverride?: string): string {
  const { sections } = proseParts(script);
  const out: string[] = [`# ${titleOverride || script.title || 'Untitled'}`];
  for (const s of sections) {
    if (s.heading) out.push('', `## ${s.heading}`);
    for (const m of s.markdown) out.push('', m);
  }
  out.push('');
  return out.join('\n');
}

/** The publish-ready HTML file: the article print as a complete standalone document a blog platform can take. */
export function proseHtml(script: StoredScript, generated: string, titleOverride?: string): string {
  return printHtml(proseArticleDoc(script, generated, titleOverride));
}

// ── Game script ──────────────────────────────────────────────────────────────

export interface GameBeat {
  kind: 'narration' | 'cue' | 'logic' | 'line' | 'choice' | 'jump';
  /** The speaker of a spoken line; a choice's speaker is the player. */
  speaker?: string;
  /** The beat's words: a line without its speaker tag, a choice without its marker, a jump's target;
   *  logic and cues exactly as written (the print strips a cue's brackets; the build sheet keeps them). */
  text: string;
}

export interface GamePart { title: string; beats: GameBeat[] }

const CHOICE_MARKER = /^(?:CHOICE|OPTION|PLAYER CHOICE)\s*\d*\s*[:.\-]\s*/i;

/** A spoken line split into its speaker and its words, when the line carries the tag the reader found. */
function splitSpeaker(text: string, speaker?: string): { speaker?: string; text: string } {
  if (!speaker) return { text };
  const m = text.match(/^([A-Za-z][A-Za-z0-9 .'-]{1,30}):\s*(.+)$/s);
  return m && m[1].trim().toUpperCase() === speaker ? { speaker, text: m[2].trim() } : { speaker, text };
}

/** The game script read as its parts: each part's beats in the order written — narration, cues, logic, lines, choices, jumps. */
export function gameParts(script: StoredScript): GamePart[] {
  const lines = parseScript(script.content, readingFormat(script.format)).lines;
  const parts: GamePart[] = [];
  let current: GamePart | null = null;
  const open = (title: string): GamePart => {
    current = { title, beats: [] };
    parts.push(current);
    return current;
  };
  for (const line of lines) {
    const t = line.text.trim();
    if (!t || line.type === 'empty') continue;
    if (line.type === 'slug') { open(t); continue; }
    const part = current ?? open('Opening');
    if (line.type === 'transition') {
      // A jump: `-> label` sends the story to the node the writer named; the target is kept as written.
      part.beats.push({ kind: 'jump', text: t.replace(/^->\s*/, '') });
    } else if (line.type === 'parenthetical') {
      // Logic ([IF flag], [SET flag = …]) is the game's own notation: kept exactly as written everywhere.
      part.beats.push({ kind: 'logic', text: t });
    } else if (line.type === 'shot') {
      part.beats.push({ kind: 'cue', text: t });
    } else if (line.type === 'dialogue') {
      const name = typeof line.meta?.characterName === 'string' ? line.meta.characterName : undefined;
      if (name === 'PLAYER') {
        part.beats.push({ kind: 'choice', speaker: 'PLAYER', text: t.replace(CHOICE_MARKER, '').replace(/^[*+]\s+/, '') });
      } else {
        const split = splitSpeaker(t, name);
        part.beats.push({ kind: 'line', speaker: split.speaker, text: split.text });
      }
    } else {
      part.beats.push({ kind: 'narration', text: t });
    }
  }
  return parts;
}

const BEAT_LABEL: Record<GameBeat['kind'], string> = {
  narration: 'Narration', cue: 'Cue', logic: 'Logic', line: 'Line', choice: 'Choice', jump: 'Jump',
};

/**
 * The game print: one table per part — every beat in the order written, its kind, its speaker, its words,
 * so the branching reads as a game document and not a screenplay page — then a branch map of the jumps.
 * A cue's brackets are stripped here (the Beat column already says what it is); the logic keeps its own.
 */
export function gameScriptDoc(script: StoredScript, generated: string, titleOverride?: string): PrintDoc {
  const parts = gameParts(script);
  const count = (kind: GameBeat['kind']): number => parts.reduce((n, p) => n + p.beats.filter((b) => b.kind === kind).length, 0);
  const blocks: PrintBlock[] = parts.map((p) => ({
    type: 'table',
    title: p.title,
    columns: [
      { key: 'beat', label: 'Beat', width: '14%' },
      { key: 'speaker', label: 'Speaker', width: '18%' },
      { key: 'text', label: 'Text' },
    ],
    rows: p.beats.map((b) => ({
      beat: BEAT_LABEL[b.kind],
      speaker: b.kind === 'choice' ? 'PLAYER' : (b.speaker ?? ''),
      text: b.kind === 'jump' ? `-> ${b.text}` : b.kind === 'cue' ? b.text.replace(/^\[/, '').replace(/\]$/, '') : b.text,
    })),
    empty: 'Nothing written in this part yet.',
  }));
  const jumps = parts.flatMap((p) => p.beats.filter((b) => b.kind === 'jump').map((b) => ({ from: p.title, to: b.text })));
  if (jumps.length) {
    blocks.push({
      type: 'table',
      title: 'Where the jumps go',
      columns: [
        { key: 'from', label: 'From' },
        { key: 'to', label: 'Goes to' },
      ],
      rows: jumps,
    });
  }
  if (!parts.length) blocks.push({ type: 'note', text: 'Nothing written yet.' });
  return {
    title: titleOverride || script.title || 'Untitled',
    kind: 'Game script',
    meta: [['Parts', parts.length], ['Dialogue lines', count('line')], ['Player choices', count('choice')], ['Jumps', count('jump')]],
    blocks,
    footer: script.title,
    generated,
  };
}

const counted = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/**
 * The build sheet for a game script, as one Markdown file the writer hands to whoever builds the game:
 * the structure (each part with its lines, choices and jumps counted), the cast with their line counts,
 * the script itself part by part — lines with their speakers, the player's choices grouped, logic and
 * cues exactly as written — and every jump with the part it leaves from and its target. Nothing is
 * invented: a jump's target is the label the writer wrote, never resolved to a part it might not name.
 */
export function gameBuildSheet(script: StoredScript, generated: string): string {
  const parts = gameParts(script);
  const title = script.title || 'Untitled';
  const out: string[] = [`# Build sheet — ${title}`, '', `Made from the script as written, ${generated}. Everything below is the document's own words and structure.`];
  if (!parts.length) {
    out.push('', 'Nothing written yet.', '');
    return out.join('\n');
  }
  const inPart = (p: GamePart, kind: GameBeat['kind']): number => p.beats.filter((b) => b.kind === kind).length;

  out.push('', '## Structure', '');
  for (const p of parts) {
    out.push(`- ${p.title} — ${counted(inPart(p, 'line'), 'line', 'lines')}, ${counted(inPart(p, 'choice'), 'choice', 'choices')}, ${counted(inPart(p, 'jump'), 'jump', 'jumps')}`);
  }

  const cast = new Map<string, { lines: number; choices: number }>();
  for (const p of parts) {
    for (const b of p.beats) {
      if (b.kind === 'line' && b.speaker) {
        const c = cast.get(b.speaker) ?? { lines: 0, choices: 0 };
        c.lines += 1;
        cast.set(b.speaker, c);
      }
      if (b.kind === 'choice') {
        const c = cast.get('PLAYER') ?? { lines: 0, choices: 0 };
        c.choices += 1;
        cast.set('PLAYER', c);
      }
    }
  }
  if (cast.size) {
    out.push('', '## Cast', '');
    for (const [name, c] of cast) {
      out.push(name === 'PLAYER' ? `- PLAYER — ${counted(c.choices, 'choice', 'choices')}` : `- ${name} — ${counted(c.lines, 'line', 'lines')}`);
    }
  }

  out.push('', '## The script');
  for (const p of parts) {
    out.push('', `### ${p.title}`);
    let choosing = false;
    for (const b of p.beats) {
      if (b.kind === 'choice') {
        if (!choosing) {
          out.push('', 'Player chooses:');
          choosing = true;
        }
        out.push(`- ${b.text}`);
        continue;
      }
      choosing = false;
      if (b.kind === 'line') out.push('', b.speaker ? `${b.speaker}: ${b.text}` : b.text);
      else if (b.kind === 'jump') out.push('', `-> ${b.text}`);
      else out.push('', b.text);
    }
  }

  const jumps = parts.flatMap((p) => p.beats.filter((b) => b.kind === 'jump').map((b) => ({ from: p.title, to: b.text })));
  if (jumps.length) {
    out.push('', '## Jumps', '');
    for (const j of jumps) out.push(`- ${j.from} -> ${j.to}`);
  }
  out.push('');
  return out.join('\n');
}
