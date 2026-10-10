// This device's Web Push subscription, as the database holds it
// (push_subscriptions: each person reads, adds and removes only their own).
import { supabase } from './client';
import { pushSubscriptionSchema } from '@/lib/validation/push';

/** Saves a browser subscription for this person (replacing an earlier one for the same endpoint). */
export async function saveSubscription(userId: string, sub: PushSubscriptionJSON): Promise<void> {
  const parsed = pushSubscriptionSchema.safeParse(sub);
  if (!parsed.success) throw new Error('This browser gave an unusable push subscription.');
  const { endpoint, keys } = parsed.data;
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  const { error } = await supabase.from('push_subscriptions').insert({
    user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
  });
  if (error) throw error;
}

export async function removeSubscription(endpoint: string): Promise<void> {
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  if (error) throw error;
}

/** Whether this endpoint is saved for the signed-in person. */
export async function isSubscriptionSaved(endpoint: string): Promise<boolean> {
  const { data, error } = await supabase.from('push_subscriptions').select('id').eq('endpoint', endpoint).maybeSingle();
  if (error) throw error;
  return !!data;
}
