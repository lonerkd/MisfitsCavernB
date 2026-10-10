'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import GrainOverlay from '@/components/ui/GrainOverlay';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase/client';
import { checkHibpBreach } from '@/lib/account/password-strength';
import { checkNewPassword, recoveryErrorMessage } from '@/lib/auth/recovery';

/**
 * Where the password-reset email lands. The Supabase client reads the link
 * (`detectSessionInUrl`) and signs the person in with a recovery session; this
 * page waits for that, then lets them choose a new password with `updateUser`.
 * A link that is expired, used already or opened in another browser never
 * produces a session — the person is told and offered a new one.
 */
type Phase = 'checking' | 'ready' | 'invalid' | 'done';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>('checking');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- marks the client as interactive
    setHydrated(true);
    let settled = false;
    const ready = (userEmail?: string) => {
      if (settled) return;
      settled = true;
      setEmail(userEmail ?? '');
      setPhase('ready');
    };

    // The link can carry its own failure (?error_code=otp_expired, or in the hash).
    const failed = /error(_code|_description)?=/.test(window.location.search + window.location.hash);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        ready(session.user.email ?? undefined);
      }
    });

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) ready(session.user.email ?? undefined);
    })();

    // No session after the client has had time to read the link → it's no good.
    const timer = setTimeout(() => {
      if (!settled) { settled = true; setPhase('invalid'); }
    }, failed ? 0 : 6000);

    return () => { subscription.unsubscribe(); clearTimeout(timer); };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const data = new FormData(e.currentTarget);
    const password = String(data.get('password') ?? '');
    const confirm = String(data.get('confirm') ?? '');

    const problem = checkNewPassword(password, confirm, email);
    if (problem) { setError(problem); return; }

    setSaving(true);
    try {
      const count = await checkHibpBreach(password);
      if (count > 0) {
        setError(`This password has appeared in ${count.toLocaleString()} known data breaches. Choose a unique password.`);
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) { setError(recoveryErrorMessage(updateError)); return; }
      setPhase('done');
      toast('Password updated.', 'success');
      router.replace('/projects');
    } catch (err) {
      setError(recoveryErrorMessage(err as { message?: string }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative' }}>
      <GrainOverlay />
      <div style={{ position: 'absolute', top: 28, left: 32 }}>
        <Link href="/auth" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 3, textTransform: 'uppercase', color: 'var(--fg-muted)', textDecoration: 'none' }}>
          <ArrowLeft size={13} /> Sign in
        </Link>
      </div>

      <main style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 2 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(2rem, 7vw, 3rem)', fontWeight: 400, letterSpacing: 6, lineHeight: 1, margin: '0 0 10px' }}>
            NEW <span style={{ color: 'var(--accent)' }}>PASSWORD</span>
          </h1>
          <p style={{ fontFamily: 'var(--serif)', fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--fg-muted)', margin: 0 }}>
            Choose one you haven&apos;t used before.
          </p>
        </div>

        <div style={{ background: 'var(--glass)', border: '1px solid rgba(var(--ink-rgb), 0.06)', backdropFilter: 'blur(20px)', padding: '40px 36px', borderRadius: 'var(--radius-sm)' }}>
          {phase === 'checking' && (
            <p role="status" style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, color: 'var(--fg-dim)' }}>
              CHECKING YOUR LINK…
            </p>
          )}

          {phase === 'invalid' && (
            <div role="alert" style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 20px', fontSize: 14, lineHeight: 1.6, color: 'var(--fg)' }}>
                This reset link has expired, was already used, or was opened in a different browser than the one you asked from.
              </p>
              <Link href="/auth?forgot=1" style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1, textDecoration: 'underline' }}>
                Send me a new link
              </Link>
            </div>
          )}

          {(phase === 'ready' || phase === 'done') && (
            <form ref={formRef} method="post" onSubmit={handleSubmit}>
              <Input name="password" label="New password" type="password" autoComplete="new-password" />
              <Input name="confirm" label="Confirm new password" type="password" autoComplete="new-password" />
              {error && (
                <div role="alert" style={{ padding: '10px 14px', background: 'rgba(232, 67, 26,0.08)', border: '1px solid rgba(232, 67, 26,0.2)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', marginBottom: 20, letterSpacing: 0.5 }}>
                  {error}
                </div>
              )}
              <Button type="submit" fullWidth variant="solid" isLoading={saving} disabled={!hydrated || phase === 'done'}>
                Set new password
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
