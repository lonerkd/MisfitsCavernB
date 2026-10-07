import { checkPasswordWeakness } from '@/lib/password-strength';

/** Where the reset email sends the person: the page that sets a new password. */
export const RECOVERY_PATH = '/auth/reset';

/**
 * The first problem with a new password and its confirmation, or null when it
 * can be saved. The leaked-password lookup is a network call and runs
 * separately (`checkHibpBreach`), after these.
 */
export function checkNewPassword(password: string, confirm: string, email?: string): string | null {
  // Same limits as `passwordSchema`; not imported, so the sign-in page doesn't load zod up front.
  if (password.length < 6) return 'Password must be at least 6 characters.';
  if (password.length > 200) return 'Password cannot exceed 200 characters.';
  const weak = checkPasswordWeakness(password, email);
  if (weak) return weak;
  if (password !== confirm) return "The two passwords don't match.";
  return null;
}

/** A failed `updateUser` / `resetPasswordForEmail`, in words a person can act on. */
export function recoveryErrorMessage(err: { code?: string; message?: string } | null | undefined): string {
  const code = err?.code ?? '';
  const msg = err?.message ?? '';
  if (code === 'same_password' || /different from the old password/i.test(msg)) {
    return 'Choose a password you have not used before.';
  }
  if (code === 'weak_password') return 'That password is too weak. Use a longer, more unique one.';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || /rate limit|security purposes/i.test(msg)) {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  if (code === 'session_not_found' || code === 'otp_expired' || /session|expired/i.test(msg)) {
    return 'This reset link has expired. Request a new one.';
  }
  if (/fetch failed|failed to fetch|networkerror|load failed/i.test(msg)) {
    return 'Unable to connect. Please try again later.';
  }
  return 'Something went wrong. Please try again.';
}
