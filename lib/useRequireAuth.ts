'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

// Redirect unauthenticated visitors to /auth so the workspace tools are never
// reached in a broken, account-less state.
export function useRequireAuth() {
  const router = useRouter();
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active && !data.user) router.replace('/auth');
    });
    return () => { active = false; };
  }, [router]);
}
