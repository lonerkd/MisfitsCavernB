// The printed pitch: the title and logline, the visual world (concept images), the characters and the story's beats, on the print kit.
// Pure: the deck hands over what it already shows. Images print only from https links (the kit refuses anything else).
import type { PrintBlock, PrintDoc } from '@/lib/print/kit';

export interface PitchPrintInput {
  title: string;
  accent?: string | null;
  logline: string | null;
  concepts: Array<{ url: string; title: string | null }>;
  characters: string[];
  beats: string[];
  generated: string;
}

const MAX_IMAGES = 6;
const MAX_BEATS = 12;

export function pitchDoc(i: PitchPrintInput): PrintDoc {
  const blocks: PrintBlock[] = [];
  if (i.logline?.trim()) blocks.push({ type: 'text', text: i.logline.trim(), lead: true });

  blocks.push({
    type: 'section', title: 'The visual world',
    blocks: i.concepts.length
      ? [{ type: 'columns', columns: [0, 1, 2].map((col) => i.concepts.slice(0, MAX_IMAGES).filter((_, idx) => idx % 3 === col).map((c): PrintBlock => ({ type: 'image', url: c.url, alt: c.title ?? 'Concept', caption: c.title ?? undefined }))) }]
      : [{ type: 'text', text: 'No concept references yet.' }],
  });
  blocks.push({ type: 'section', title: 'The characters', blocks: i.characters.length ? [{ type: 'tags', items: i.characters }] : [{ type: 'text', text: 'No characters yet.' }] });
  blocks.push({
    type: 'section', title: 'Story engine',
    blocks: i.beats.length
      ? [{ type: 'list', ordered: true, items: i.beats.slice(0, MAX_BEATS) }, ...(i.beats.length > MAX_BEATS ? [{ type: 'note', text: `${i.beats.length - MAX_BEATS} more beats in the project.` } as PrintBlock] : [])]
      : [{ type: 'text', text: 'No story beats yet.' }],
  });

  return { title: i.title, kind: 'Pitch', accent: i.accent, blocks, footer: i.title, generated: i.generated };
}
