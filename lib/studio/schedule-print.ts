// The printed shooting schedule: one table per shoot day, in order, with the pages for the day and its scenes (heading, interior/exterior
// and day/night, who is in it, pages, status). Built on the print kit. Pure: the stripboard hands over plain facts.
import type { PrintBlock, PrintDoc } from '@/lib/print/kit';

export interface ScheduleDay {
  day: number;
  /** The date as people say it, or null when the day has none. */
  date: string | null;
  pages: string;
  locations: number;
  scenes: Array<{ number: number; heading: string; kind: string; cast: string[]; pages: string; status: string }>;
}

export interface SchedulePrintInput {
  project: string;
  accent?: string | null;
  days: ScheduleDay[];
  totalScenes: number;
  totalPages: string;
  generated: string;
}

export function scheduleDoc(i: SchedulePrintInput): PrintDoc {
  const days = i.days.filter((d) => d.scenes.length > 0);
  const blocks: PrintBlock[] = days.map((d) => ({
    type: 'section',
    title: `Day ${d.day}${d.date ? ` · ${d.date}` : ''} · ${d.pages} pp${d.locations > 1 ? ` · ${d.locations} locations` : ''}`,
    blocks: [{
      type: 'table',
      columns: [{ key: 'n', label: 'Sc', width: '8%' }, { key: 'h', label: 'Scene' }, { key: 'k', label: 'I/E · D/N', width: '14%' }, { key: 'c', label: 'Cast', width: '24%' }, { key: 'p', label: 'Pages', align: 'right', width: '9%' }, { key: 's', label: 'Status', width: '12%' }],
      rows: d.scenes.map((s) => ({ n: s.number, h: s.heading, k: s.kind, c: s.cast.join(', ') || '—', p: s.pages, s: s.status })),
    }],
  }));
  if (blocks.length === 0) blocks.push({ type: 'note', text: 'Nothing is scheduled yet.' });
  return {
    title: 'Shooting schedule',
    kind: 'Schedule',
    subtitle: i.project,
    accent: i.accent,
    meta: [['Scenes', i.totalScenes], ['Days', days.length], ['Pages', i.totalPages]],
    blocks,
    footer: i.project,
    generated: i.generated,
    orientation: 'landscape',
  };
}
