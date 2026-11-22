// The call as a text message: what the production sends to one person from the phone's own messaging app. No server
// send and no provider: the production taps "Text it", their phone opens a message already written, they pick the
// recipient and press send. Pure.

const MAX_BODY = 320; // two segments' worth: short enough to read on a lock screen

export interface CallTextInput {
  project: string;
  day: number;
  /** The shoot date as people say it ("Tue 3 Nov"), or null. */
  date: string | null;
  /** The person's own call, "HH:MM", or empty when they have none (the general call is used instead). */
  call: string;
  /** The role the call is as ("MAYA"), when it is a cast call. */
  as?: string | null;
  /** The sheet's address, when there is one. */
  location?: string | null;
  /** The full link to the crew's call page. */
  url: string;
}

/** The message text. The link is last and never cut; the rest is trimmed to keep the whole under one lock-screen read. */
export function callTextBody(i: CallTextInput): string {
  const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
  const when = [`Day ${i.day}`, i.date ? clean(i.date) : ''].filter(Boolean).join(' · ');
  const head = `${clean(i.project)} — ${when}.`;
  const call = i.call ? `Your call ${i.call}${i.as ? ` as ${clean(i.as)}` : ''}.` : '';
  const where = i.location?.trim() ? `At ${clean(i.location)}.` : '';
  const tail = `Full call sheet: ${i.url}`;
  const room = MAX_BODY - tail.length - 1;
  let text = [head, call, where].filter(Boolean).join(' ');
  if (text.length > room) text = `${text.slice(0, Math.max(0, room - 1)).trimEnd()}…`;
  return `${text} ${tail}`;
}

/** An `sms:` link that opens the messaging app with the text filled in and no recipient (the production picks it there).
 *  `?&body=` is the form both iOS and Android read; the body is percent-encoded, so spaces, ampersands and accents survive. */
export function smsHref(body: string): string {
  return `sms:?&body=${encodeURIComponent(body)}`;
}
