// Checks a channel suggestion (public.channel_presets, admin-written) before it
// is saved. The database enforces the same rules; this says them in words. Pure.

export const PRESET_TYPES = ['text', 'voice', 'guide'] as const;
export const PRESET_AUDIENCES = ['team', 'owners', 'above', 'below', 'guests', 'public'] as const;
export const PRESET_POLICIES = ['viewers', 'members', 'managers'] as const;
export const PRESET_PHASES = ['development', 'pre-production', 'production', 'post-production', 'delivery'] as const;

export interface PresetInput {
  key: string; name: string; type: (typeof PRESET_TYPES)[number]; audience: (typeof PRESET_AUDIENCES)[number];
  post_policy: (typeof PRESET_POLICIES)[number]; phase: (typeof PRESET_PHASES)[number]; topic: string; why: string;
}
export type PresetCheck = { ok: true; value: PresetInput } | { ok: false; error: string };

/** "Sound & Music!" → "sound-music": the channel's name as the Lounge writes it. */
export const presetKey = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

export function checkPreset(input: Omit<PresetInput, 'key'>, existingKeys: string[] = []): PresetCheck {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (!name) return { ok: false, error: 'Give the channel a name.' };
  if (name.length > 40) return { ok: false, error: 'Keep the name under 40 characters.' };
  const key = presetKey(name);
  if (!/^[a-z][a-z0-9-]{1,40}$/.test(key)) return { ok: false, error: 'Start the name with a letter, and use at least two characters.' };
  if (existingKeys.includes(key)) return { ok: false, error: `There is already a suggestion called “${key}”.` };
  if (!PRESET_TYPES.includes(input.type) || !PRESET_AUDIENCES.includes(input.audience) || !PRESET_POLICIES.includes(input.post_policy) || !PRESET_PHASES.includes(input.phase)) {
    return { ok: false, error: 'Pick a type, an audience, who can post and a phase.' };
  }
  const topic = input.topic.trim();
  const why = input.why.trim();
  if (!why) return { ok: false, error: 'Say why a production wants this channel — one line.' };
  if (topic.length > 200 || why.length > 200) return { ok: false, error: 'Keep the topic and the reason under 200 characters.' };
  return { ok: true, value: { key, name: key, type: input.type, audience: input.audience, post_policy: input.post_policy, phase: input.phase, topic, why } };
}
