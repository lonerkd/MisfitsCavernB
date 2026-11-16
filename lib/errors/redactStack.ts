// A stack trace says where code ran, not who ran it, but it can carry the
// origin the page was served from, absolute file paths, query strings (tokens
// ride in them) and, in a message-like frame, an email or a token. Everything
// of that kind is replaced before a stack is stored or shown.
//
// MIRRORED IN SQL: `report_client_error` (migration 20261115000600) applies the
// same rules, in the same order, with `regexp_replace`, so a caller that skips
// this function is redacted anyway. Change both together; `redactStack.test.ts`
// and `tests/integration/client-errors.test.ts` use the same sample. Only
// constructs common to JavaScript and PostgreSQL regular expressions are used
// (character classes, `{n,}`, `(?:...)`, one capture group).

const RULES: ReadonlyArray<readonly [RegExp, string]> = [
  // an email address
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]'],
  // a JWT: header.payload[.signature], each part base64url, the header starts eyJ
  [/eyJ[A-Za-z0-9_-]{5,}(?:\.[A-Za-z0-9_-]+){1,2}/g, '[token]'],
  // an origin: scheme://host[:port] (https://app.example.com, webpack-internal://, file://)
  [/[A-Za-z][A-Za-z0-9+.-]*:\/\/[^\/\s)]*/g, '[origin]'],
  // a query string, up to a colon (so `:line:col` after it survives) or a space or paren
  [/\?[A-Za-z0-9_=&%.~+\/,;@-]*/g, ''],
  // a long hex run (a key, a hash, a session id)
  [/[0-9A-Fa-f]{32,}/g, '[token]'],
  // a long base64-ish run
  [/[A-Za-z0-9_-]{40,}/g, '[token]'],
  // a file path with at least one directory (absolute, or ./ ../ relative), cut
  // down to `/name`; `:line:col` after the name stays
  [/(?:[A-Za-z]:|\.{1,2})?[\\\/](?:[^\s()\\\/]+[\\\/])+([^\s()\\\/:]+)/g, '/$1'],
];

/** `stack` with origins, paths, query strings, tokens and emails taken out. */
export function redactStack(stack: string): string {
  let out = stack;
  for (const [re, to] of RULES) out = out.replace(re, to);
  return out;
}
