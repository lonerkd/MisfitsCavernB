'use client';
import { useEffect, useState } from 'react';
import { useOutbox } from '@/components/mobile/Capture';
import { islandCondition, type IslandCondition } from './condition';

/** Connection and outbox, as the island says them. */
export function useIslandCondition(): IslandCondition {
  const waiting = useOutbox().length;
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const set = () => setOnline(navigator.onLine);
    set();
    window.addEventListener('online', set);
    window.addEventListener('offline', set);
    return () => { window.removeEventListener('online', set); window.removeEventListener('offline', set); };
  }, []);
  return islandCondition({ online, waiting });
}
