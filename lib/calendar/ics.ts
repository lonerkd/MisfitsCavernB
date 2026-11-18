// A calendar feed as an .ics file (RFC 5545): all-day events for shoot days and due dates, timed events (floating local
// time: the call sheet says 07:00, so the phone shows 07:00 wherever it is) for an issued call sheet. Pure: the route fetches
// the rows, this turns them into text, and the tests read the text.

export interface FeedRow {
  kind: string;
  uid: string;
  project_title: string;
  summary: string;
  day: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM[:SS]
  end_time: string | null;
  location: string | null;
  notes: string | null;
}

/** Text values: backslash, semicolon, comma and newlines are escaped. */
export const escapeText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 octets are folded: CRLF and a space. Splits on characters, never inside a multi-byte one. */
export function fold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > (out.length === 0 ? 75 : 74)) { out.push(cur); cur = ''; bytes = 0; }
    cur += ch; bytes += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

const ymd = (day: string) => day.replace(/-/g, '');
const hms = (t: string) => { const [h = '00', m = '00', s = '00'] = t.split(':'); return `${h.padStart(2, '0')}${m.padStart(2, '0')}${s.slice(0, 2).padStart(2, '0')}`; };
const addDays = (day: string, n: number) => { const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** The whole calendar. `now` is a parameter so a test gets the same text every time. */
export function buildIcs(rows: readonly FeedRow[], now: Date = new Date()): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//The Cavern//Calendar feed//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:The Cavern'];
  for (const r of rows) {
    lines.push('BEGIN:VEVENT', `UID:${r.uid}@cavern`, `DTSTAMP:${stamp(now)}`);
    if (r.start_time) {
      const start = hms(r.start_time);
      // The wrap time ends it; with none (or one that is not after the call) it runs an hour, so it shows as a block.
      const end = r.end_time && hms(r.end_time) > start ? hms(r.end_time) : null;
      lines.push(`DTSTART:${ymd(r.day)}T${start}`);
      lines.push(end ? `DTEND:${ymd(r.day)}T${end}` : 'DURATION:PT1H');
    } else {
      lines.push(`DTSTART;VALUE=DATE:${ymd(r.day)}`, `DTEND;VALUE=DATE:${ymd(addDays(r.day, 1))}`);
    }
    lines.push(`SUMMARY:${escapeText(`${r.summary} · ${r.project_title}`)}`);
    if (r.location) lines.push(`LOCATION:${escapeText(r.location)}`);
    if (r.notes) lines.push(`DESCRIPTION:${escapeText(r.notes)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export const FEED_TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
