// The community's Discord server: a public invite link, shown on the landing
// page when it is set. Only the invite is public. The server's bot token and
// any webhook URL are secrets — they never go in the repo or in a NEXT_PUBLIC_
// variable (a channel's own webhook is stored per channel, server-side only).

const INVITE = /^https:\/\/(discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-]{2,32}$/;

/** The invite link if it is a real Discord invite over https; otherwise null (so a typo shows nothing, not a broken link). */
export function discordInvite(value: string | undefined | null): string | null {
  const v = (value ?? '').trim();
  return INVITE.test(v) ? v : null;
}

export const DISCORD_INVITE = discordInvite(process.env.NEXT_PUBLIC_DISCORD_INVITE_URL);
