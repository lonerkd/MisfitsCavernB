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
});
