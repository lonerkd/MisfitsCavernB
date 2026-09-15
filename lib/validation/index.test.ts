import { describe, it, expect } from 'vitest';
import {
  discordWebhookUrlSchema,
  discordNotifyBodySchema,
  discordTestBodySchema,
  referenceSearchQuerySchema,
  signInSchema,
  signUpSchema,
  firstIssue,
  issueMap,
  parseJsonBody,
} from './index';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_WEBHOOK = 'https://discord.com/api/webhooks/123456789012345678/abcDEF-123_xyz';

describe('discordWebhookUrlSchema', () => {
  it('accepts real discord.com and discordapp.com webhook URLs', () => {
    expect(discordWebhookUrlSchema.safeParse(VALID_WEBHOOK).success).toBe(true);
    expect(
      discordWebhookUrlSchema.safeParse('https://discordapp.com/api/webhooks/9/abc').success,
    ).toBe(true);
  });

  it('trims surrounding whitespace before validating', () => {
    expect(discordWebhookUrlSchema.safeParse(`  ${VALID_WEBHOOK}  `).success).toBe(true);
  });

  it.each([
    ['plain http', 'http://discord.com/api/webhooks/1/abc'],
    ['non-discord host', 'https://evil.example.com/api/webhooks/1/abc'],
    ['lookalike host', 'https://discord.com.evil.example.com/api/webhooks/1/abc'],
    ['missing token', 'https://discord.com/api/webhooks/1'],
    ['empty', ''],
  ])('rejects %s', (_label, value) => {
    expect(discordWebhookUrlSchema.safeParse(value).success).toBe(false);
  });
});

describe('discordNotifyBodySchema', () => {
  it('accepts a uuid channel and trims content', () => {
    const result = discordNotifyBodySchema.safeParse({
      channelId: VALID_UUID,
      content: '  hello crew  ',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.content).toBe('hello crew');
  });

  it('rejects a non-uuid channel', () => {
    expect(discordNotifyBodySchema.safeParse({ channelId: 'general', content: 'hi' }).success).toBe(false);
  });

  it.each([['empty', ''], ['whitespace only', '   ']])('rejects %s content', (_label, content) => {
    expect(discordNotifyBodySchema.safeParse({ channelId: VALID_UUID, content }).success).toBe(false);
  });

  it('rejects content beyond the 2000 character cap', () => {
    const result = discordNotifyBodySchema.safeParse({
      channelId: VALID_UUID,
      content: 'x'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown-shaped payloads instead of silently accepting them', () => {
    expect(discordNotifyBodySchema.safeParse(null).success).toBe(false);
    expect(discordNotifyBodySchema.safeParse({ content: 'hi' }).success).toBe(false);
  });
});

describe('discordTestBodySchema', () => {
  it('requires the webhookUrl field', () => {
    expect(discordTestBodySchema.safeParse({}).success).toBe(false);
    expect(discordTestBodySchema.safeParse({ webhookUrl: VALID_WEBHOOK }).success).toBe(true);
  });
});

describe('referenceSearchQuerySchema', () => {
  it('defaults q to empty and page to 1 when absent', () => {
    expect(referenceSearchQuerySchema.parse({})).toEqual({ q: '', page: 1 });
  });

  it('coerces the page query string to a number', () => {
    expect(referenceSearchQuerySchema.parse({ page: '7' }).page).toBe(7);
  });

  it.each(['0', '51', 'abc'])('rejects page=%s', (page) => {
    expect(referenceSearchQuerySchema.safeParse({ page }).success).toBe(false);
  });

  it('rejects search terms beyond 200 characters', () => {
    expect(referenceSearchQuerySchema.safeParse({ q: 'x'.repeat(201) }).success).toBe(false);
  });
});

describe('auth schemas', () => {
  it('accepts a valid sign-up and trims email/username', () => {
    expect(
      signUpSchema.parse({ email: '  sam@example.com ', password: 'hunter22', username: '  sam  ' }),
    ).toEqual({ email: 'sam@example.com', password: 'hunter22', username: 'sam' });
  });

  it.each([
    ['not an email', { email: 'nope', password: 'hunter22' }],
    ['short password', { email: 'sam@example.com', password: '12345' }],
  ])('sign-in rejects %s', (_label, input) => {
    expect(signInSchema.safeParse(input).success).toBe(false);
  });

  it.each([
    ['single-character username', 'a'],
    ['spaces in username', 'sam smith'],
    ['unsafe punctuation', 'sam!'],
  ])('sign-up rejects %s', (_label, username) => {
    expect(
      signUpSchema.safeParse({ email: 'sam@example.com', password: 'hunter22', username }).success,
    ).toBe(false);
  });
});

describe('error helpers', () => {
  it('firstIssue returns the first human-readable message', () => {
    const result = signUpSchema.safeParse({ email: 'nope', password: '1', username: '!' });
    expect(result.success).toBe(false);
    if (!result.success) expect(firstIssue(result.error)).toBe('Enter a valid email address.');
  });

  it('issueMap keys messages by field name', () => {
    const result = signUpSchema.safeParse({ email: 'nope', password: '1', username: '!' });
    if (!result.success) {
      expect(Object.keys(issueMap(result.error)).sort()).toEqual(['email', 'password', 'username']);
    }
  });
});

describe('parseJsonBody', () => {
  const req = (body: unknown, throws = false) => ({
    json: async () => {
      if (throws) throw new SyntaxError('bad json');
      return body;
    },
  });

  it('returns typed data on a valid body', async () => {
    const result = await parseJsonBody(req({ webhookUrl: VALID_WEBHOOK }), discordTestBodySchema);
    expect(result.ok).toBe(true);
  });

  it('returns the validation message on an invalid body', async () => {
    const result = await parseJsonBody(req({ webhookUrl: 'nope' }), discordTestBodySchema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Discord webhook URL/i);
  });

  it('returns a clean error when the body is not JSON at all', async () => {
    expect(await parseJsonBody(req(null, true), discordTestBodySchema)).toEqual({
      ok: false,
      error: 'Invalid request body.',
    });
  });
});
