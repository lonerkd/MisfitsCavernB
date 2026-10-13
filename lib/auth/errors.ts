// What a sign-in failure says to the person. A suspended account gets the real
// reason (the auth service says only "User is banned"); everything else keeps
// the service's own message.

export function signInMessage(message: string | undefined | null): string {
  const m = (message ?? '').trim();
  if (/banned|suspended/i.test(m)) return 'This account has been suspended. If you think that is a mistake, message @lonerkid on Instagram.';
  return m || 'Sign in failed';
}
