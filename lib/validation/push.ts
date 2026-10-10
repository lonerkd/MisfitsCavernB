// Web Push payloads — their own file, not the barrel: the barrel ships to
// every page's first-load JS, and these are only needed by the dispatch route
// and the (lazily loaded) Settings push flow. (Bundle budget.)
import { z } from 'zod';
import { uuidSchema } from './index';

// What the database posts to /api/push/dispatch (internal.push_notification).
export const pushDispatchBodySchema = z.object({
  notification_id: uuidSchema,
});

// A browser's push subscription (PushSubscription.toJSON()), as Settings saves it.
export const pushSubscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https?$/ }).max(2000),
  keys: z.object({
    p256dh: z.string().min(40).max(200),
    auth: z.string().min(10).max(100),
  }),
});
