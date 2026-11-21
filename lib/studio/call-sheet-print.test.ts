import { describe, it, expect } from 'vitest';
import { callSheetDoc, type CallSheetPrintInput } from './call-sheet-print';
import { printHtml } from '@/lib/print/kit';

const input = (over: Partial<CallSheetPrintInput> = {}): CallSheetPrintInput => ({
  project: 'The Pier', accent: '#12ab9f', day: 3, date: 'Thu 12 Mar 2026', generalCall: '06:00', shootingCall: '06:30', wrap: '18:00',
  location: 'Cais do Sodré', weather: 'Clear, 14°', light: 'Sunrise 06:12 · Sunset 18:20', planNotes: ['Golden hour is at 17:40; scene 9 is scheduled at 16:00.'], notes: 'Park at the north gate.',
  scenes: [{ number: 4, heading: 'EXT. PIER - DAY' }, { number: 9, heading: 'EXT. FERRY - GOLDEN HOUR' }], pages: '2.5',
  locations: ['Cais do Sodré'], cast: [{ name: 'MAYA', call: '07:00', remarks: 'Wet wardrobe' }, { name: 'LUIS', call: '', remarks: null }],
  crew: [{ name: 'sam', role: 'Director', call: '06:00', remarks: null }], generated: '8 Nov 2026', ...over,
});

describe('the printed call sheet', () => {
  it('has the day, date and calls up top, then notes, scenes, locations, cast and crew', () => {
    const doc = callSheetDoc(input());
    expect(doc).toMatchObject({ kind: 'Call sheet', title: 'Day 3 · Thu 12 Mar 2026', subtitle: 'The Pier', accent: '#12ab9f' });
    const html = printHtml(doc);
    for (const s of ['General call', '06:30', 'Cais do Sodré', 'Golden hour is at 17:40', 'Park at the north gate.', 'Scenes (2 · 2.5 pg)', 'EXT. FERRY - GOLDEN HOUR', 'MAYA', 'Wet wardrobe', 'Director']) expect(html).toContain(s);
    expect(html.indexOf('>Scenes')).toBeLessThan(html.indexOf('>Cast<'));
    expect(html.indexOf('>Cast<')).toBeLessThan(html.indexOf('>Crew<'));
  });

  it('puts the Cast, Crew and Scenes headings in their tables\' headers, so each repeats on a continuation page', () => {
    const html = printHtml(callSheetDoc(input()));
    // Scenes has 2 columns, Cast 3, Crew 4: each title spans its own table.
    expect(html).toContain('<th colspan="2" style="border-bottom:0;padding:0 0 2pt"><h2>Scenes (2 · 2.5 pg)</h2></th>');
    expect(html).toContain('<th colspan="3" style="border-bottom:0;padding:0 0 2pt"><h2>Cast</h2></th>');
    expect(html).toContain('<th colspan="4" style="border-bottom:0;padding:0 0 2pt"><h2>Crew</h2></th>');
  });

  it('shows a dash for an actor with no call yet, and says so on an empty day', () => {
    const html = printHtml(callSheetDoc(input({ scenes: [], cast: [{ name: 'LUIS', call: '', remarks: null }], crew: [], locations: [], notes: null, planNotes: [], pages: null })));
    expect(html).toContain('<td class="left">LUIS</td><td class="left">—</td>');
    expect(html).toContain('Nothing scheduled this day.');
    expect(html).toContain('No crew on the project yet.');
    expect(html).toContain('No location set.');
    expect(html).not.toContain('>Notes<');
  });

  it('prints a day with no date set, and escapes what people typed', () => {
    const doc = callSheetDoc(input({ date: null, notes: '<script>x</script>' }));
    expect(doc.title).toBe('Day 3');
    expect(printHtml(doc)).not.toContain('<script>x');
  });
});
