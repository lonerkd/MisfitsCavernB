// Moderation wording and checks shared by the admin queue and the places a
// person meets the result. Pure: the database decides, this only words it.

export type ModerationAction = 'hide' | 'suspend' | 'dismiss';
export type ReportOutcome = 'hidden' | 'suspended' | 'hidden_and_suspended';
export type ModeratedKind = 'message' | 'job' | 'profile';

export const REASON_MAX = 500;

/** What the database says when a suspended account tries to post, apply, create or report. */
export const SUSPENDED_NOTICE = 'Your account is suspended: you can read, but not post, apply, create or report. If you think that is a mistake, message @lonerkid on Instagram.';

/** Whether an error is the database refusing a suspended account (the trigger's own sentence). */
export function isSuspendedError(error: unknown): boolean {
  const message = typeof error === 'string' ? error : (error as { message?: unknown } | null)?.message;
  return typeof message === 'string' && /account is suspended/i.test(message);
}

/** The reason an admin typed, trimmed, or null when it is empty or too long. Hide and suspend need one. */
export function cleanReason(text: string): string | null {
  const t = text.trim();
  return t.length > 0 && t.length <= REASON_MAX ? t : null;
}

/** What a settled report says was done. */
export function outcomeLabel(outcome: string | null | undefined, status: string): string {
  if (status === 'dismissed') return 'Dismissed, no action';
  switch (outcome) {
    case 'hidden': return 'Hidden';
    case 'suspended': return 'Account suspended';
    case 'hidden_and_suspended': return 'Hidden, account suspended';
    default: return 'Resolved';
  }
}

/** The note the author reads in place of their own hidden work. */
export function removedNote(kind: ModeratedKind, reason?: string | null): string {
  const what = kind === 'job' ? 'This job' : kind === 'message' ? 'This message' : 'Your public page';
  const why = reason && reason.trim() ? ` Reason: ${reason.trim()}` : '';
  return `${what} was removed by moderators and is no longer visible to others.${why}`;
}
