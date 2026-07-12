'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

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

      if (!isRetry && !retriedRef.current) {
        retriedRef.current = true;
        setTimeout(() => { if (active) check(true); }, 500);
        return;
      }

      router.replace('/auth');
      setIsLoading(false);
    };

    check();
    return () => { active = false; };
  }, [router]);

  return { isLoading, user };
}
