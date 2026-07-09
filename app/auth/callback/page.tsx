                                                                    'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';

// Discord's raw OAuth payload, as Supabase stores it under identities[].identity_data
interface DiscordIdentityData {
  id?: string;
  username?: string;
  global_name?: string;
  full_name?: string;
  avatar_url?: string;
  picture?: string;
}

function buildProfileFields(session: Session) {
  const user = session.user;
  const discordIdentity = user.identities?.find(i => i.provider === 'discord');
  const discordData = discordIdentity?.identity_data as DiscordIdentityData | undefined;

  return {
    id: user.id,
    username: discordData?.global_name || discordData?.full_name ||
      user.user_metadata?.full_name || user.user_metadata?.name ||
      discordData?.username || user.email?.split('@')[0] || 'user',
    avatar_url: discordData?.avatar_url || discordData?.picture || user.user_metadata?.avatar_url || null,
    discord_id: discordData?.id || null,
    discord_username: discordData?.username || null,
    discord_avatar: discordData?.avatar_url || discordData?.picture || null,
    status: 'OPEN' as const,
  };
}

async function ensureProfile(session: Session) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, discord_username')
    .eq('id', session.user.id)
    .single();

  const fields = buildProfileFields(session);

  if (!profile) {
    await supabase.from('profiles').insert(fields);
  } else if (fields.discord_id && !profile.discord_username) {
    // Backfill Discord identity onto a profile created before linking Discord
    await supabase.from('profiles').update({
      discord_id: fields.discord_id,
      discord_username: fields.discord_username,
      discord_avatar: fields.discord_avatar,
    }).eq('id', session.user.id);
  }
}

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Hash-based (implicit) and code-based (PKCE) OAuth both eventually land
    // on a real session, but racing sequential getSession()/code-exchange
    // calls could resolve before the client's own detectSessionInUrl
    // processing finishes, bouncing the user back to /auth. Listen for the
    // SIGNED_IN event as the primary signal, keep the manual code-exchange
    // path as a parallel attempt, and guard both (plus a timeout fallback)
    // behind one idempotent `finish` so only the first resolution wins.
    let done = false;
    const finish = (path: string, session?: Session) => {
      if (done) return;
      done = true;
      (async () => {
        if (session) {
          try { await ensureProfile(session); } catch (e) { console.error('Failed to ensure profile:', e); }
        }
        router.push(path);
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

    // Fallback: if nothing resolves, send back to sign in instead of hanging.
    const timeout = setTimeout(() => finish('/auth'), 5000);

    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
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
