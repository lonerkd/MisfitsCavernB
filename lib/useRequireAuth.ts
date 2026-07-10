'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

/**
 * Redirect unauthenticated visitors to /auth and expose loading state.
 * Retries getUser() once after a short delay because OAuth sign-in can
 * finish before the session cookie is fully synced, causing an immediate
 * false-negative redirect back to /auth.
 */
export function useRequireAuth(): { isLoading: boolean; user: { id: string } | null } {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const retriedRef = useRef(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    const check = async (isRetry = false) => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;

      if (data.user) {
        setUser({ id: data.user.id });
        setIsLoading(false);
        return;
      }

      // On first attempt, retry once after a short delay — the session
      // cookie may not be fully synced yet after an OAuth redirect.
      if (!isRetry && !retriedRef.current) {
        retriedRef.current = true;
        setTimeout(() => { if (active) check(true); }, 500);
        return;
      }

      // Both attempts failed — definitely not authenticated.
      router.replace('/auth');
      setIsLoading(false);
    };

    check();
    return () => { active = false; };
  }, [router]);

  return { isLoading, user };
}
