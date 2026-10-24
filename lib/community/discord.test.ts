import { describe, expect, it } from 'vitest';
import { discordInvite } from './discord';

describe('discordInvite', () => {
  it('accepts a Discord invite over https', () => {
    expect(discordInvite('https://discord.gg/GRZ9qk68uN')).toBe('https://discord.gg/GRZ9qk68uN');
    expect(discordInvite(' https://discord.com/invite/abc-123 ')).toBe('https://discord.com/invite/abc-123');
  });
  it('shows nothing for anything else — unset, http, another site, a webhook', () => {
    expect(discordInvite(undefined)).toBeNull();
    expect(discordInvite('')).toBeNull();
    expect(discordInvite('http://discord.gg/abc')).toBeNull();
    expect(discordInvite('https://example.com/discord.gg/abc')).toBeNull();
    expect(discordInvite('https://discord.com/api/webhooks/1/secret')).toBeNull();
  });
  it('treats null and whitespace-only as unset', () => {
    expect(discordInvite(null)).toBeNull();
    expect(discordInvite('   ')).toBeNull();
    expect(discordInvite('\n\t')).toBeNull();
  });
  it('rejects other schemes', () => {
    expect(discordInvite('ftp://discord.gg/abc')).toBeNull();
    expect(discordInvite('javascript:alert(1)//discord.gg/abc')).toBeNull();
    expect(discordInvite('//discord.gg/abc')).toBeNull();
    expect(discordInvite('discord.gg/abc')).toBeNull();
    expect(discordInvite('HTTPS://discord.gg/abc')).toBeNull();
  });
  it('rejects a trailing slash, query, fragment, extra path or inner whitespace', () => {
    expect(discordInvite('https://discord.gg/abc/')).toBeNull();
    expect(discordInvite('https://discord.gg/abc?event=1')).toBeNull();
    expect(discordInvite('https://discord.gg/abc#x')).toBeNull();
    expect(discordInvite('https://discord.gg/abc/def')).toBeNull();
    expect(discordInvite('https://discord.gg/ab c')).toBeNull();
    expect(discordInvite('https://discord.gg/abc\nhttps://evil.example')).toBeNull();
  });
  it('rejects look-alike hosts and a missing code', () => {
    expect(discordInvite('https://discord.gg.evil.com/abc')).toBeNull();
    expect(discordInvite('https://evildiscord.gg/abc')).toBeNull();
    expect(discordInvite('https://discord.gg@evil.com/abc')).toBeNull();
    expect(discordInvite('https://www.discord.gg/abc')).toBeNull();
    expect(discordInvite('https://discord.com/invite/')).toBeNull();
    expect(discordInvite('https://discord.gg/')).toBeNull();
    expect(discordInvite('https://discord.com/invites/abc')).toBeNull();
    expect(discordInvite('https://discord.com/abc')).toBeNull();
  });
  it('limits the invite code to 2–32 characters of letters, digits and hyphens', () => {
    const ok = (n: number) => `https://discord.gg/${'a'.repeat(n)}`;
    expect(discordInvite(ok(1))).toBeNull();
    expect(discordInvite(ok(2))).toBe(ok(2));
    expect(discordInvite(ok(32))).toBe(ok(32));
    expect(discordInvite(ok(33))).toBeNull();
    expect(discordInvite('https://discord.gg/a_b')).toBeNull();
    expect(discordInvite('https://discord.gg/a.b')).toBeNull();
    expect(discordInvite('https://discord.gg/é-é')).toBeNull();
    expect(discordInvite('https://discord.gg/--')).toBe('https://discord.gg/--');
  });
});
