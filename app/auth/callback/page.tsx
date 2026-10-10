                                                                    'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { ensureProfile } from '@/lib/supabase/profiles';
import type { Session } from '@supabase/supabase-js';

/** A brand-new account: its first sign-in is its creation. */
function isFirstSignIn(session: Session): boolean {
  const created = Date.parse(session.user.created_at ?? '');
  const signedIn = Date.parse(session.user.last_sign_in_at ?? '');
  return Number.isFinite(created) && Number.isFinite(signedIn) && Math.abs(signedIn - created) < 60_000;
}

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {

    let done = false;
    const finish = (path: string, session?: Session) => {
      if (done) return;
      done = true;
      (async () => {
        if (session) {
          try { await ensureProfile(session); } catch (e) { console.error('Failed to ensure profile:', e); }
        }
        router.push(session && isFirstSignIn(session) ? '/welcome' : path);
      })();
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish('/profile', session);
    });

    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      if (code) {
        const { data } = await supabase.auth.exchangeCodeForSession(code);
        if (data?.session) { finish('/profile', data.session); return; }
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session) finish('/profile', session);
    })();

    const timeout = setTimeout(() => finish('/auth'), 5000);

    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', letterSpacing: 6, marginBottom: 24 }}>
          MISFITS<br /><span style={{ color: 'var(--accent)' }}>CAVERN</span>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 3, color: 'var(--fg-dim)' }}>AUTHENTICATING...</div>
        <div style={{ marginTop: 24, width: 120, height: 2, background: 'rgba(var(--ink-rgb), 0.1)', borderRadius: 4, margin: '24px auto 0', overflow: 'hidden' }}>
          <div style={{ width: '40%', height: '100%', background: 'var(--accent)', borderRadius: 4, animation: 'authSlide 1.2s ease-in-out infinite' }} />
        </div>
        <style>{`
          @keyframes authSlide {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(200%); }
            100% { transform: translateX(-100%); }
          }
        `}</style>
      </div>
    </div>
  );
}
