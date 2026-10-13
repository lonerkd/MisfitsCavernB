// What to tell a person when a Spotify call fails. Spotify's own error bodies are terse; the
// causes that matter for a Development Mode app are the account not being on its allowlist,
// the app owner's Premium lapsing, and the request limits.

export function describeSpotifyFailure(status: number, body?: { error?: { message?: string } | string } | null): string {
  const raw = typeof body?.error === 'string' ? body.error : body?.error?.message ?? '';
  if (status === 401) return 'Spotify signed you out. Connect it again.';
  if (status === 403) {
    if (/premium/i.test(raw)) return 'Spotify says this app’s owner needs an active Premium subscription.';
    return 'Spotify refused this account. While the app is in Development Mode, your Spotify email must be added under User Management in its dashboard, and the owner needs Premium.';
  }
  if (status === 429) return 'Spotify is rate-limiting this app. Try again in a minute.';
  if (status === 400 && /limit/i.test(raw)) return 'Spotify rejected the search size. Try again after the next update.';
  if (status >= 500) return 'Spotify is having trouble right now. Try again shortly.';
  return `Spotify search failed (${status}).`;
}
