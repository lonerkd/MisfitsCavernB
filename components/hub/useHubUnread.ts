'use client';

import { useEffect, useState } from 'react';
import { useCurrentUser } from '@/lib/os';
import { listPosts, listReadIds, unreadCount } from '@/lib/hub/posts';

const EVENT = 'mc-hub-read';

/** Tell the badge a post was read. */
export function emitHubRead() {
  window.dispatchEvent(new Event(EVENT));
}

/** Published hub posts the signed-in person hasn't opened. 0 when signed out or on error. */
export function useHubUnread(): number {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    const load = () => {
      Promise.all([listPosts(), listReadIds()])
        .then(([posts, read]) => { if (live) setCount(unreadCount(posts, read)); })
        .catch((e) => console.error('Hub unread count failed:', e));
    };
    load();
    window.addEventListener(EVENT, load);
    return () => { live = false; window.removeEventListener(EVENT, load); };
  }, [userId]);

  return userId ? count : 0;
}
