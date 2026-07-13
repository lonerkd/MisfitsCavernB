'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import GrainOverlay from '@/components/GrainOverlay';
import { useToast } from '@/components/Toast';
import { osSignIn as signIn, osSignUp as signUp } from '@/lib/os';
import { withTimeout } from '@/lib/supabase/withTimeout';
import { checkPasswordWeakness, checkHibpBreach } from '@/lib/password-strength';
import { supabase } from '@/lib/supabase/client';

type Mode = 'signin' | 'signup';

interface Field {
  name: string;
  label: string;
  type: string;
  placeholder: string;
  show?: boolean;
}

export default function AuthPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ email: '', username: '', password: '' });

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!emailRegex.test(form.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (mode === 'signup' && !form.username.trim()) {
      setError('Please choose a username.');
      return;
    }
    if (!form.password) {
      setError('Please enter your password.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (mode === 'signup') {
      const weak = checkPasswordWeakness(form.password, form.email, form.username);
      if (weak) { setError(weak); return; }
      const count = await checkHibpBreach(form.password);
      if (count > 0) { setError(`This password has appeared in ${count.toLocaleString()} known data breaches. Choose a unique password.`); setLoading(false); return; }
    }

    setLoading(true);

    try {

      if (mode === 'signin') {
        await withTimeout(signIn(form.email, form.password), 30000, 'Sign-in timed out.');
      } else {
        await withTimeout(signUp(form.email, form.password, form.username), 30000, 'Sign-up timed out.');
      }

      toast(mode === 'signin' ? 'Welcome back.' : 'Account created.', 'success');

      setTimeout(() => router.push('/projects'), 600);
    } catch (err: any) {
      const code = err.code || '';
      const msg = err.message || '';

      if (code === 'invalid_credentials' || msg.includes('Invalid login credentials')) {
        setError('Incorrect email or password.');
      } else if (code === 'user_already_exists' || msg.includes('User already registered')) {
        setError('An account with this email already exists.');
      } else if (code === 'email_not_confirmed' || msg.includes('Email not confirmed')) {
        setError('Please check your email to confirm your account.');
      } else if (code === 'weak_password') {
        setError('Password must be at least 8 characters with uppercase, lowercase, and numbers.');
      } else if (code === 'otp_expired') {
        setError('Confirmation code has expired. Please try again.');
      } else if (msg.includes('Invalid API key') || msg.includes('fetch failed')) {
        setError('Unable to connect. Please try again later.');
      } else if (msg.includes('timed out')) {
        setError('This is taking too long — check your connection and try again.');
      } else if (msg.includes('rate limit')) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(m => m === 'signin' ? 'signup' : 'signin');
    setError('');
  };

  return (
    <main style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative' }}>
      <GrainOverlay />

      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 40%, rgba(215, 52, 11,0.05) 0%, transparent 60%)',
      }} />

      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        style={{ position: 'absolute', top: 28, left: 32 }}
      >
        <Link href="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: 'var(--mono)',
          fontSize: 9,
          letterSpacing: 3,
          textTransform: 'uppercase',
          color: 'var(--fg-muted)',
          textDecoration: 'none',
          transition: 'color 0.3s',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-muted)')}
        >
          <ArrowLeft size={13} /> Back
        </Link>
      </motion.div>

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 2 }}>

        <motion.div
          initial={{ opacity: 0, y: -20, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: 'center', marginBottom: 48 }}
        >
          <div style={{
            fontFamily: 'var(--display)',
            fontSize: 'clamp(2.2rem, 8vw, 3.4rem)',
            letterSpacing: 6,
            lineHeight: 1,
            marginBottom: 10,
          }}>
            MISFITS<br /><span style={{ color: 'var(--accent)' }}>CAVERN</span>
          </div>
          <p style={{ fontFamily: 'var(--serif)', fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--fg-muted)', margin: 0 }}>
            {mode === 'signin' ? 'Welcome back, misfit.' : 'Join the cavern.'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: 'rgba(10,10,10,0.8)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
            padding: '40px 36px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div style={{
            display: 'flex',
            marginBottom: 32,
            background: 'rgba(255,255,255,0.03)',
            padding: 3,
            borderRadius: 'var(--radius-sm)',
          }}>
            {(['signin', 'signup'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: mode === m ? 'rgba(255,255,255,0.06)' : 'transparent',
                  border: 'none',
                  color: mode === m ? 'var(--fg)' : 'var(--fg-muted)',
                  fontFamily: 'var(--mono)',
                  fontSize: 9,
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  borderRadius: 'calc(var(--radius-sm) - 2px)',
                  transition: 'all 0.3s',
                }}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <Input
              name="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={handleChange}
            />

            <AnimatePresence>
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  style={{ overflow: 'hidden' }}
                >
                  <Input
                    name="username"
                    label="Username"
                    type="text"
                    value={form.username}
                    onChange={handleChange}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <Input
              name="password"
              label="Password"
              type="password"
              value={form.password}
              onChange={handleChange}
            />

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(215, 52, 11,0.08)',
                    border: '1px solid rgba(215, 52, 11,0.2)',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    color: 'var(--accent)',
                    marginBottom: 20,
                    letterSpacing: 0.5,
                  }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              fullWidth
              isLoading={loading}
              variant="solid"
            >
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, color: 'var(--fg-subtle)' }}>
              or
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
          </div>

          <button
            type="button"
            onClick={async () => {

              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'discord',
                options: { redirectTo: `${window.location.origin}/auth/callback` }
              });
              if (error) toast(error.message || 'Could not start Discord sign-in.', 'error');
            }}
            style={{ width: '100%', padding: '14px', background: 'rgba(88,101,242,0.12)', border: '1px solid rgba(88,101,242,0.4)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.2s', marginTop: 24, borderRadius: 'var(--radius-sm)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(88,101,242,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(88,101,242,0.12)'}>
            <svg width="16" height="12" viewBox="0 0 71 55" fill="#5865f2"><path d="M60.1 4.9A58.5 58.5 0 0045.6 0a40 40 0 00-1.8 3.7 54.1 54.1 0 00-16.2 0A38.5 38.5 0 0025.9 0 58.3 58.3 0 0011.3 5C1.6 19.6-1 33.8.3 47.9a58.8 58.8 0 0017.9 9 44 44 0 003.8-6.2 38.3 38.3 0 01-6-2.9l1.5-1.2a41.9 41.9 0 0036.2 0l1.5 1.2a38.3 38.3 0 01-6 2.9 44 44 0 003.8 6.2 58.6 58.6 0 0017.9-9C72 31.6 68.3 17.5 60.1 4.9zM23.7 39.4c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2 6.5 3.2 6.4 7.2c0 4-2.8 7.2-6.4 7.2zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2 6.5 3.2 6.4 7.2c0 4-2.9 7.2-6.4 7.2z"/></svg>
            CONTINUE WITH DISCORD
          </button>

          <p style={{
            marginTop: 20,
            textAlign: 'center',
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--fg-muted)',
            letterSpacing: 1,
          }}>
            {mode === 'signin' ? "New here? " : 'Have an account? '}
            <button onClick={switchMode} style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              fontFamily: 'var(--mono)',
              fontSize: 10,
              letterSpacing: 1,
              textDecoration: 'underline',
            }}>
              {mode === 'signin' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </motion.div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}
