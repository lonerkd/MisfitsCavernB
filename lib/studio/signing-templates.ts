// Starting texts for paperwork a person signs. They are plain, short and fill in the production's and the person's names, so
// the production edits them before sending. They are a starting point, not legal advice: have a lawyer review any text you
// rely on (the sign page says the same to the signer's side of the deal).

export type SigningTemplateId = 'crew-deal' | 'appearance-release' | 'location-release' | 'nda';

export interface SigningFill {
  /** The production's title. */
  project: string;
  /** The person (or the location's owner) signing. */
  signer: string;
  /** Their part: "Gaffer", the character, the location's name. */
  role?: string;
  /** An agreed rate or fee, written as the production wants it read ("$250 per day"). */
  rate?: string;
  /** The shoot date or range, written as the production wants it read. */
  dates?: string;
}

export const SIGNING_TEMPLATES: Array<{ id: SigningTemplateId; label: string; docKind: 'contract' | 'release'; title: (f: SigningFill) => string; body: (f: SigningFill) => string }> = [
  {
    id: 'crew-deal', label: 'Crew deal memo', docKind: 'contract',
    title: (f) => `Crew deal memo — ${f.signer}`,
    body: (f) => [
      `CREW DEAL MEMO — ${f.project}`,
      '',
      `This memo is between the production of "${f.project}" (the Production) and ${f.signer} (the Crew Member).`,
      '',
      `Position: ${f.role || '[position]'}`,
      `Rate: ${f.rate || '[rate]'}`,
      `Dates: ${f.dates || '[dates]'}`,
      '',
      'The Crew Member will provide services in the position above on the dates above, to the standard the Production reasonably asks for. The Production will pay the rate above within the time it has told the Crew Member, and will provide a safe place to work.',
      'Work made for the Production in this position belongs to the Production, and the Crew Member may show it in a personal reel once the Production has released the film.',
      'Either side may end this by telling the other in writing; the Production pays for work done up to then.',
    ].join('\n'),
  },
  {
    id: 'appearance-release', label: 'Appearance release', docKind: 'release',
    title: (f) => `Appearance release — ${f.signer}`,
    body: (f) => [
      `APPEARANCE RELEASE — ${f.project}`,
      '',
      `I, ${f.signer}, allow the production of "${f.project}" (the Production) to film, record and photograph me${f.role ? ` as ${f.role}` : ''}${f.dates ? ` on ${f.dates}` : ''}, and to use those images and recordings, and my name and likeness as shown in them, in the film and in its promotion, in any medium, anywhere in the world.`,
      '',
      f.rate ? `Payment: ${f.rate}.` : 'Payment: as agreed with the Production.',
      'I understand the Production will edit the material as it chooses, and that I am not promised any particular use of it.',
    ].join('\n'),
  },
  {
    id: 'location-release', label: 'Location release', docKind: 'release',
    title: (f) => `Location release — ${f.role || f.signer}`,
    body: (f) => [
      `LOCATION RELEASE — ${f.project}`,
      '',
      `I, ${f.signer}, own or control the location called "${f.role || '[location]'}" and allow the production of "${f.project}" (the Production) to enter, film and record there${f.dates ? ` on ${f.dates}` : ''}, and to show the location in the film and its promotion, in any medium, anywhere in the world.`,
      '',
      f.rate ? `Fee: ${f.rate}.` : 'Fee: as agreed with the Production.',
      'The Production will leave the location as it found it, will repair any damage it causes, and will carry the insurance it has told me about.',
    ].join('\n'),
  },
  {
    id: 'nda', label: 'Confidentiality agreement', docKind: 'contract',
    title: (f) => `Confidentiality agreement — ${f.signer}`,
    body: (f) => [
      `CONFIDENTIALITY AGREEMENT — ${f.project}`,
      '',
      `I, ${f.signer}, will keep private the script, the cast, the schedule and anything else I learn about "${f.project}" while I work on it, and will not share them with anyone outside the production until the Production has made them public.`,
      '',
      'This does not cover what is already public, or what I am required by law to disclose. It continues after my work on the production ends.',
    ].join('\n'),
  },
];

/** The sign link for a request: an absolute URL when the page's origin is known. */
export const signUrl = (token: string, origin = '') => `${origin}/sign/${token}`;

/** Where a request stands, in words the production reads. */
export function signingState(r: { status: string; expires_at: string; signed_name: string | null; signed_at: string | null }, now = new Date()): { label: string; tone: 'done' | 'open' | 'warn' | 'bad' } {
  if (r.status === 'signed') return { label: `Signed by ${r.signed_name ?? 'the signer'}${r.signed_at ? ` on ${r.signed_at.slice(0, 10)}` : ''}`, tone: 'done' };
  if (r.status === 'declined') return { label: 'Declined', tone: 'bad' };
  if (r.status === 'void') return { label: 'Withdrawn', tone: 'warn' };
  if (Date.parse(r.expires_at) <= now.getTime()) return { label: 'Expired, never signed', tone: 'bad' };
  return { label: `Waiting for a signature · link works until ${r.expires_at.slice(0, 10)}`, tone: 'open' };
}
