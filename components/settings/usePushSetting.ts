'use client';

// Settings › Notifications › Push on this device: where push stands here and
// a way to switch it. (lib/push/client.ts does the work — imported on demand,
// so it stays out of the page's first-load JS. Bundle budget.)
import { useEffect, useState } from 'react';
import type { PushState } from '@/lib/push/client';

// The client module, loaded when the hook first needs it.
const pushClient = () => import('@/lib/push/client');

export const PUSH_HINT: Record<PushState | 'checking', string> = {
  checking: 'Checking this device…',
  on: 'This device gets your notifications (call sheets, replies, jobs) even when The Cavern is closed.',
  off: 'Get your notifications on this device even when The Cavern is closed.',
  blocked: 'Notifications are blocked for The Cavern in this browser’s settings — allow them there, then switch this on.',
  'needs-install': 'On iPhone, add The Cavern to your Home Screen first (Share → Add to Home Screen), then switch this on from there.',
  unsupported: 'This browser can’t receive push notifications.',
  'not-configured': 'Push isn’t set up on this server yet.',
};

export function usePushSetting(userId: string | null, onError: (message: string) => void) {
  const [state, setState] = useState<PushState | 'checking'>('checking');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    pushClient()
      .then((m) => m.pushState())
      .then((s) => { if (alive) setState(s); }, () => { if (alive) setState('unsupported'); });
    return () => { alive = false; };
  }, []);

  const toggle = async (on: boolean) => {
    if (!userId || busy) return;
    setBusy(true);
    try {
      const { disablePush, enablePush } = await pushClient();
      setState(on ? await enablePush(userId) : await disablePush());
    } catch (e) {
      onError((e as { message?: string })?.message || 'Could not change push on this device');
    } finally {
      setBusy(false);
    }
  };

  return { state, busy, toggle, switchable: state === 'on' || state === 'off' };
}
