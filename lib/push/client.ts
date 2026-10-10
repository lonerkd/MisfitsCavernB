// Push on this device (browser only): ask, subscribe, and forget.
// iOS allows Web Push only in the installed app (16.4+), so on an iPhone in
// Safari the answer is "add to Home Screen first" (lib/pwa/install.ts).
import { isSubscriptionSaved, removeSubscription, saveSubscription } from '@/lib/supabase/push';

export type PushState = 'unsupported' | 'needs-install' | 'not-configured' | 'blocked' | 'off' | 'on';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const isIOSBrowser = () => {
  const nav = navigator as Navigator & { standalone?: boolean };
  const ios = /iPhone|iPad|iPod/.test(nav.userAgent) || (/Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1);
  return ios && nav.standalone !== true && !window.matchMedia('(display-mode: standalone)').matches;
};

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

/** Where push stands on this device for the signed-in person. */
export async function pushState(): Promise<PushState> {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('PushManager' in window) || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return isIOSBrowser() ? 'needs-install' : 'unsupported';
  }
  if (!PUBLIC_KEY) return 'not-configured';
  if (Notification.permission === 'denied') return 'blocked';
  const sub = await (await registration())?.pushManager.getSubscription();
  if (!sub) return 'off';
  return (await isSubscriptionSaved(sub.endpoint).catch(() => false)) ? 'on' : 'off';
}

/** Asks (if needed), subscribes this device and saves it for this person. */
export async function enablePush(userId: string): Promise<PushState> {
  if (!PUBLIC_KEY) return 'not-configured';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';
  const reg = (await registration()) ?? (await navigator.serviceWorker.register('/sw.js'));
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) }));
  await saveSubscription(userId, sub.toJSON());
  return 'on';
}

/** Stops push on this device: forgets it in the database and unsubscribes. */
export async function disablePush(): Promise<PushState> {
  const sub = await (await registration())?.pushManager.getSubscription();
  if (sub) {
    await removeSubscription(sub.endpoint);
    await sub.unsubscribe();
  }
  return 'off';
}

/**
 * On sign-out: this device stops receiving the person's notifications (a
 * browser's subscription belongs to the device, not the account). Best
 * effort, and never holds sign-out up for more than two seconds.
 */
export async function forgetThisDevicePush(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  const work = (async () => {
    const sub = await (await registration())?.pushManager?.getSubscription();
    if (!sub) return;
    await removeSubscription(sub.endpoint).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  })().catch(() => {});
  await Promise.race([work, new Promise((r) => setTimeout(r, 2000))]);
}
