// Getting a campaign's copy out: one piece or the whole set, as plain text or (lib/ad/exportPdf.ts) a PDF
// for the client's own tools. Everything here is pure: the panel fetches the copy and hands it in.
import { DELIVERABLE_KINDS, isDeliverableKind } from './kinds';
import { characterCount, COPY_SECTIONS, copyText, estimateSeconds, parseCopy, spokenWords, type CopySection } from './copy';

/** What the panel knows about one piece when it exports. */
export type ExportPiece = {
  title: string;
  kind: string;
  /** Where its latest review version stands, in the team's words ("Draft", "Client approved"…). */
  status: string;
  /** The script text as stored (`# HEADLINE` … blocks). */
  content: string;
  maxChars: number | null;
  maxSeconds: number | null;
  wordsPerSecond: number;
  notes: string;
};

/** A piece laid out for either format. */
export type PieceView = {
  title: string;
  kindLabel: string;
  status: string;
  /** Characters and spoken time against the limits, one line each; empty when the piece has no limits. */
  limits: string[];
  /** The sections that have text, in the editor's order. */
  sections: Array<{ label: string; text: string }>;
  notes: string;
};

const SECTION_LABELS: Record<CopySection, string> = {
  HEADLINE: 'Headline',
  VISUAL: 'Visual',
  VO: 'Voice-over',
  SFX: 'Sound',
  BODY: 'Body',
  CTA: 'Call to action',
};

const over = (used: number, limit: number) => (used > limit ? ` (over by ${used - limit})` : '');

export function describePiece(piece: ExportPiece): PieceView {
  const blocks = parseCopy(piece.content);
  const limits: string[] = [];
  if (piece.maxChars != null) {
    const used = characterCount(copyText(blocks));
    limits.push(`Characters: ${used} of ${piece.maxChars}${over(used, piece.maxChars)}`);
  }
  if (piece.maxSeconds != null) {
    const words = spokenWords(blocks);
    const seconds = estimateSeconds(words, piece.wordsPerSecond);
    limits.push(`Spoken: ${words} word${words === 1 ? '' : 's'}, about ${seconds} s of ${piece.maxSeconds} s${over(seconds, piece.maxSeconds)}`);
  }
  return {
    title: piece.title.trim() || 'Untitled piece',
    kindLabel: isDeliverableKind(piece.kind) ? DELIVERABLE_KINDS[piece.kind].label : piece.kind,
    status: piece.status,
    limits,
    sections: COPY_SECTIONS.filter((section) => blocks[section]).map((section) => ({ label: SECTION_LABELS[section], text: blocks[section] })),
    notes: piece.notes.trim(),
  };
}

export function pieceToText(view: PieceView): string {
  const lines = [view.title, `${view.kindLabel} · ${view.status}`, ...view.limits];
  for (const section of view.sections) lines.push('', section.label, section.text);
  if (view.notes) lines.push('', 'Notes', view.notes);
  return lines.join('\n');
}

const RULE = '='.repeat(40);
const THIN = '-'.repeat(40);

/** The whole set in one text file: a header, then each piece. */
export function setToText(campaign: string, views: PieceView[], date: string): string {
  const header = [campaign.trim() || 'Campaign', `Exported ${date} · ${views.length} piece${views.length === 1 ? '' : 's'}`];
  if (views.length === 0) return header.join('\n');
  return [header.join('\n'), RULE, views.map(pieceToText).join(`\n\n${THIN}\n\n`)].join('\n\n');
}

const slug = (text: string, fallback: string) => {
  const cleaned = text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
  return cleaned || fallback;
};

/** A safe file name: `campaign.txt` for a set, `campaign-piece.pdf` for one piece. */
export function exportFileName(campaign: string, pieceTitle: string | null, extension: 'txt' | 'pdf'): string {
  const base = slug(campaign, 'campaign');
  return pieceTitle == null ? `${base}.${extension}` : `${base}-${slug(pieceTitle, 'piece')}.${extension}`;
}

// jsPDF's built-in fonts hold Western European text (Windows-1252) only. Anything else would print as
// garbage, so it becomes "?" and the plain-text export, which keeps every character, is the way out.
const WIN_ANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');

export function pdfSafe(text: string): string {
  let out = '';
  for (const char of text.replace(/\r\n?/g, '\n').replace(/\t/g, '    ')) {
    const code = char.codePointAt(0)!;
    const ok = char === '\n' || (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WIN_ANSI_EXTRA.has(char);
    out += ok ? char : '?';
  }
  return out;
}

/** True when pdfSafe would have to replace something, so the panel can say so. */
export const needsPdfFallback = (text: string): boolean => pdfSafe(text) !== text.replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
