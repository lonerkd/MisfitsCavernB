// Client-side password weakness check for signup. Substitutes for Supabase's
// HaveIBeenPwned integration (Pro-plan feature): blocks the passwords that
// dominate credential-stuffing lists plus anything derived from the user's
// own email/username. Returns a user-facing message, or null if acceptable.

const COMMON = new Set([
  '123456', '123456789', '12345678', '1234567890', 'password', 'password1',
  'password123', 'qwerty', 'qwerty123', 'qwertyuiop', '111111', '123123',
  'abc123', '1q2w3e4r', 'iloveyou', 'admin', 'welcome', 'welcome1', 'monkey',
  'dragon', 'letmein', 'sunshine', 'princess', 'football', 'baseball',
  'superman', 'batman', 'trustno1', 'master', 'shadow', 'michael', 'jordan',
  'harley', 'hunter', 'ranger', 'buster', 'soccer', 'hockey', 'killer',
  'george', 'charlie', 'andrew', 'thomas', 'jessica', 'daniel', 'starwars',
  'klaster', 'computer', 'michelle', 'freedom', 'whatever', 'nicole',
  'jonathan', 'anthony', 'justin', 'banana', 'flower', 'summer', 'winter',
  'secret', 'ginger', 'pepper', 'cookie', 'ashley', 'bailey', 'passw0rd',
  'p@ssword', 'p@ssw0rd', 'zaq12wsx', '1qaz2wsx', 'qazwsx', 'asdfgh',
  'asdfghjkl', 'zxcvbnm', '654321', '666666', '696969', '777777', '888888',
  '987654321', 'aa123456', 'a123456', '123qwe', '1234qwer', 'q1w2e3r4',
  'pokemon', 'naruto', 'pikachu', 'mustang', 'access', 'maggie', 'cheese',
  'internet', 'samsung', 'google', 'liverpool', 'chelsea', 'arsenal',
  'hello123', 'test123', 'temp123', 'changeme', 'default', 'root', 'toor',
  'misfits', 'cavern', 'misfitscavern', 'filmmaker', 'screenplay',
]);

export function checkPasswordWeakness(password: string, email?: string, username?: string): string | null {
  const p = password.toLowerCase();

  // Strip trivial suffix decoration ("password2024!", "qwerty!!") before the
  // dictionary check so decorated common passwords are still caught.
  const stripped = p.replace(/[\d!@#$%^&*()_+\-=.,?]{1,4}$/, '');
  if (COMMON.has(p) || COMMON.has(stripped)) {
    return 'That password is on the most-common-passwords list. Pick something more unique.';
  }

  // Identity-derived passwords.
  const emailLocal = (email || '').split('@')[0].toLowerCase();
  for (const part of [emailLocal, (username || '').toLowerCase()]) {
    if (part.length >= 4 && (p.includes(part) || part.includes(p))) {
      return "Your password can't be based on your email or username.";
    }
  }

  // Single repeated character or straight keyboard runs.
  if (/^(.)\1+$/.test(p)) return 'Your password is a single repeated character. Pick something more unique.';
  if ('abcdefghijklmnopqrstuvwxyz'.includes(p) || '0123456789'.includes(p)) {
    return 'Your password is a simple sequence. Pick something more unique.';
  }

  return null;
}
