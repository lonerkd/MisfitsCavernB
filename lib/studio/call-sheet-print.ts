// The printed call sheet: what the crew reads the night before. Built on the print kit (one look for everything the suite prints):
// the day, the date and the calls in the header strip, then the notes, the scenes and locations, the cast with their calls and the
// crew with theirs. Pure: the panel hands over plain text and times, so the same day prints the same page.
import type { PrintBlock, PrintDoc } from '@/lib/print/kit';

export interface CallSheetPrintInput {
  project: string;
  accent?: string | null;
  day: number;
  /** The shoot date as people say it ("Thu 12 Mar 2026"), or null when none is set. */
  date: string | null;
  generalCall: string;
  shootingCall: string;
  wrap: string;
  location: string | null;
  weather: string | null;
  /** The day's light as one line ("Sunrise 06:12 · Sunset 18:20"), or empty. */
  light: string;
  /** Plan warnings worth printing (the light, the continuity), already worded. */
  planNotes: string[];
  notes: string | null;
  scenes: Array<{ number: number; heading: string }>;
  pages: string | null;
  locations: string[];
  cast: Array<{ name: string; call: string; remarks: string | null }>;
  crew: Array<{ name: string; role: string; call: string; remarks: string | null }>;
  generated: string;
}

export function callSheetDoc(i: CallSheetPrintInput): PrintDoc {
  const blocks: PrintBlock[] = [];
  for (const n of i.planNotes) blocks.push({ type: 'note', text: n });
  if (i.notes?.trim()) blocks.push({ type: 'section', title: 'Notes', blocks: [{ type: 'text', text: i.notes.trim() }] });

  blocks.push({
    type: 'columns',
    columns: [
      [{
        type: 'section', title: `Scenes (${i.scenes.length}${i.pages ? ` · ${i.pages} pg` : ''})`,
        blocks: [{ type: 'table', columns: [{ key: 'n', label: 'Sc', width: '14%' }, { key: 'h', label: 'Heading' }], rows: i.scenes.map((s) => ({ n: s.number, h: s.heading })), empty: 'Nothing scheduled this day.' }],
      }],
      [{
        type: 'section', title: 'Locations',
        blocks: i.locations.length ? [{ type: 'list', items: i.locations }] : [{ type: 'text', text: 'No location set.' }],
      }],
    ],
  });

  blocks.push({
    type: 'section', title: 'Cast',
    blocks: [{ type: 'table', columns: [{ key: 'name', label: 'Character' }, { key: 'call', label: 'Call', width: '14%' }, { key: 'remarks', label: 'Remarks' }], rows: i.cast.map((c) => ({ name: c.name, call: c.call || '—', remarks: c.remarks })), empty: 'No cast in the scenes scheduled this day.' }],
  });
  blocks.push({
    type: 'section', title: 'Crew',
    blocks: [{ type: 'table', columns: [{ key: 'name', label: 'Name' }, { key: 'role', label: 'Role' }, { key: 'call', label: 'Call', width: '14%' }, { key: 'remarks', label: 'Remarks' }], rows: i.crew.map((c) => ({ name: c.name, role: c.role, call: c.call || '—', remarks: c.remarks })), empty: 'No crew on the project yet.' }],
  });

  return {
    title: `Day ${i.day}${i.date ? ` · ${i.date}` : ''}`,
    kind: 'Call sheet',
    subtitle: i.project,
    accent: i.accent,
    meta: [['General call', i.generalCall], ['Shooting call', i.shootingCall], ['Est. wrap', i.wrap], ['Location', i.location], ['Weather', i.weather], ['Light', i.light]],
    blocks,
    footer: i.project,
    generated: i.generated,
  };
}
