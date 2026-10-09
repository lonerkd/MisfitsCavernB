import { z } from 'zod';

// ── Shared primitives ────────────────────────────────────────────────
// One place to define what each shape of input is allowed to be, so the API
// routes, the client forms, and the types all agree. Types are derived with
// z.infer — never re-declared by hand.

export const uuidSchema = z.uuid('Expected a UUID.');

export const emailSchema = z
  .string()
  .trim()
  .pipe(
    z
      .email('Enter a valid email address.')
      .max(254, 'Email addresses cannot exceed 254 characters.'),
  );

export const usernameSchema = z
  .string()
  .trim()
  .min(2, 'Username must be at least 2 characters.')
  .max(32, 'Username cannot exceed 32 characters.')
  .regex(/^[a-zA-Z0-9_.-]+$/, 'Username may only contain letters, numbers, . _ or -');

export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters.')
  .max(200, 'Password cannot exceed 200 characters.');

export const messageContentSchema = z
  .string()
  .trim()
  .min(1, 'Message cannot be empty.')
  .max(2000, 'Message cannot exceed 2000 characters.');

// Discord webhook URLs are strictly shaped; anything else (a typo, a revoked
// URL from another service) would silently never deliver.
export const discordWebhookUrlSchema = z
  .string()
  .trim()
  .regex(
    /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/,
    'That doesn’t look like a Discord webhook URL. It should look like https://discord.com/api/webhooks/123.../abc...',
  );

// ─ API route payloads ───────────────────────────────────────────────

export const discordTestBodySchema = z.object({
  webhookUrl: discordWebhookUrlSchema,
});

export const discordNotifyBodySchema = z.object({
  channelId: uuidSchema,
  content: messageContentSchema,
});

export const referenceSearchQuerySchema = z.object({
  q: z.string().trim().max(200, 'Search terms cannot exceed 200 characters.').default(''),
  page: z.coerce
    .number()
    .int()
    .min(1, 'Page must be 1 or greater.')
    .max(50, 'Page cannot exceed 50.')
    .default(1),
});

// ── Auth ─────────────────────────────────────────────────────────────

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
});

// ── Helpers ─────────────────────────────────────────────────────────

/** First human-readable problem from a failed parse. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid input.';
}

/** All problems keyed by field name — for form-level error display. */
export function issueMap(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Parse an untrusted JSON request body. Returns the typed value or the
 * response-ready error string, so routes stay a two-line lookup instead of
 * hand-rolled typeof checks.
 */
export async function parseJsonBody<S extends z.ZodType>(
  req: { json: () => Promise<unknown> },
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; error: string }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, error: 'Invalid request body.' };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  return { ok: true, data: parsed.data };
}

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type DiscordNotifyBody = z.infer<typeof discordNotifyBodySchema>;
export type DiscordTestBody = z.infer<typeof discordTestBodySchema>;
export type ReferenceSearchQuery = z.infer<typeof referenceSearchQuerySchema>;