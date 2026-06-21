'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      // Handle hash-based auth (implicit flow)
      if (window.location.hash) {
        // Supabase client auto-detects hash fragments when detectSessionInUrl is true
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session) {
          // Ensure profile exists
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .single();
          
          if (!profile) {
            await supabase.from('profiles').insert({
              id: session.user.id,
              username: session.user.user_metadata?.full_name || 
                       session.user.user_metadata?.name ||
                       session.user.email?.split('@')[0] || 'user',
              avatar_url: session.user.user_metadata?.avatar_url || null,
              status: 'OPEN'
            });
          }
          
          router.push('/profile');
          return;
        }
      }

      // Handle code-based auth (PKCE flow)
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (data?.session) {
          // Ensure profile exists
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', data.session.user.id)
            .single();
          
          if (!profile) {
            await supabase.from('profiles').insert({
              id: data.session.user.id,
              username: data.session.user.user_metadata?.full_name || 
                       data.session.user.user_metadata?.name ||
                       data.session.user.email?.split('@')[0] || 'user',
              avatar_url: data.session.user.user_metadata?.avatar_url || null,
              status: 'OPEN'
            });
          }
          
          router.push('/profile');
          return;
        }
      }

      // Fallback: try getting existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/profile');
      } else {
        router.push('/auth');
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', letterSpacing: 6, marginBottom: 24 }}>
          MISFITS<br /><span style={{ color: 'var(--accent)' }}>CAVERN</span>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 3, opacity: 0.5 }}>AUTHENTICATING...</div>
        <div style={{ marginTop: 24, width: 120, height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 1, margin: '24px auto 0', overflow: 'hidden' }}>
          <div style={{ width: '40%', height: '100%', background: 'var(--accent)', borderRadius: 1, animation: 'authSlide 1.2s ease-in-out infinite' }} />
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
