// What an import tells the person about how well it was read (BACKLOG 3.21, B9: the confidence goes out to where a script arrives).
// The reader already knows which lines it is unsure of (`doubtfulReads`); after an import the person should hear that, and where to settle
// it, instead of finding out later. Pure: the same parse the editor does, counted.
import { parseScript } from './parser';
import { doubtfulReads } from './review';

/** How many distinct doubts (a name is one, however many lines it heads) the reader has about an imported script's text. */
export function importDoubts(text: string): number {
  try {
    return doubtfulReads(parseScript(text).lines, { limit: 1000 }).length;
  } catch {
    return 0;
  }
}

/** The line shown after an import: the title, then (only when there is something to look at) how many things to look at and where. */
export function importMessage(title: string, doubts: number): string {
  if (doubts <= 0) return `Imported "${title}"`;
  return `Imported "${title}". The reader is not sure about ${doubts === 1 ? '1 thing' : `${doubts} things`}: see Doubtful reads in the Script tab.`;
}
