'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

/**
 * Redirect unauthenticated visitors to /auth and expose loading state
 * so the calling component can show a spinner during the auth check.
 */
export function useRequireAuth(): { isLoading: boolean; user: { id: string } | null } {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (!data.user) {
        router.replace('/auth');
      } else {
        setUser({ id: data.user.id });
      }
      setIsLoading(false);
    });
    return () => { active = false; };
  }, [router]);

  return { isLoading, user };
}
