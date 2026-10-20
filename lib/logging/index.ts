// Security events the suite records about itself. Pure helpers first — what is
// worth sending — then the one function that sends. Never throws: logging a
// refused password must not break the screen that refused it.

import { supabase } from '@/lib/supabase/client';

export type BreachContext = 'signup' | 'reset' | 'change';

export interface BreachEvent {
  email: string;
  count: number;
  context: BreachContext;
}

/**
 * The event to send, or null when it isn't one (no breach, no usable address).
 * The address goes to the server as typed, over TLS, and is hashed there with a
 * secret key (`log_password_breach`); it is never stored and never hashed in the
 * browser, where an unkeyed hash of a guessable address could be matched.
 */
export function toBreachEvent(email: string, count: number, context: BreachContext): BreachEvent | null {
  const addr = email.trim().toLowerCase();
  if (!Number.isFinite(count) || count < 1) return null;
  if (addr.length < 3 || addr.length > 320 || addr.indexOf('@') < 1) return null;
  return { email: addr, count: Math.min(Math.floor(count), 2_147_483_647), context };
}

/** Record that a breached password was refused. Fire and forget. */
export async function logPasswordBreach(email: string, count: number, context: BreachContext): Promise<void> {
  const event = toBreachEvent(email, count, context);
  if (!event) return;
  try {
    const { error } = await supabase.rpc('log_password_breach', {
      p_email: event.email,
      p_breach_count: event.count,
      p_context: event.context,
    });
    if (error) console.warn('Could not record the breached-password event:', error.message);
  } catch (err) {
    console.warn('Could not record the breached-password event:', err);
  }
}
