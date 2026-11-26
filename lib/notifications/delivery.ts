// What happened to a notification's push, said plainly (BACKLOG 3.53). The bell shows it so a held notification is not a silent one:
// the person can see it was kept for their quiet hours, or that the phone could not be reached. Pure; the columns are written only by the push sender.
export interface DeliveryFields { push_skipped?: string | null; pushed_at?: string | null }

/** A short line for the cases worth telling the person about, or null (a push that went out, or one the person switched off, needs no note). */
export function deliveryNote(n: DeliveryFields): string | null {
  switch (n.push_skipped) {
    case 'quiet-hours': return 'Held for your quiet hours. It did not buzz your phone.';
    case 'failed': return 'Your phone could not be reached for this one.';
    default: return null;
  }
}
