'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    let done = false;
    const finish = (path: string) => { if (!done) { done = true; router.push(path); } };

    // The supabase client (detectSessionInUrl: true) processes the OAuth
    // redirect on load and fires SIGNED_IN. Listen for it, and also check the
    // current session in case it resolved before we subscribed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) finish('/');
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) finish('/');
    });

    // Fallback: if nothing resolves, send back to sign in.
    const t = setTimeout(() => finish('/auth'), 5000);

    return () => { subscription.unsubscribe(); clearTimeout(t); };
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 3, opacity: 0.5 }}>AUTHENTICATING...</div>
    </div>
  );
}
