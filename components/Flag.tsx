'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { FLAGS, flagEnv, flagOn, type FlagName } from '@/lib/flags';
import { getMyAccount } from '@/lib/supabase/profiles';

/** Whether a feature flag is on here, for this person. */
export function useFlag(name: FlagName): boolean {
  const env = flagEnv();
  const needsAdmin = env === 'production' && (FLAGS[name] as { production: string }).production === 'admins';
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!needsAdmin) return;
    let live = true;
    getMyAccount().then((a) => { if (live) setIsAdmin(!!a?.is_admin); }).catch(() => {});
    return () => { live = false; };
  }, [needsAdmin]);
  return flagOn(name, { env, isAdmin });
}

/** Renders its children only where the flag is on. */
export function Flag({ name, children, fallback = null }: { name: FlagName; children: ReactNode; fallback?: ReactNode }) {
  return <>{useFlag(name) ? children : fallback}</>;
}
