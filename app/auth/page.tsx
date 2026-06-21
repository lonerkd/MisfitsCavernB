'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Loader } from 'lucide-react';
import GrainOverlay from '@/components/GrainOverlay';
import { useToast } from '@/components/Toast';
import { signIn, signUp } from '@/lib/supabase/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

// Map raw Supabase/PostgREST errors to copy that won't leak backend
// implementation details (API keys, table names, etc.) to end users.
function friendlyAuthError(raw: string): string {
  const msg = raw.toLowerCase();
  if (msg.includes('invalid api key') || msg.includes('invalid_api_key')) {
    return 'Sign-in is temporarily unavailable. Please try again shortly.';
  }
  if (msg.includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }
  if (msg.includes('user already registered') || msg.includes('already registered')) {
    return 'An account with that email already exists. Try signing in instead.';
  }
  if (msg.includes('password') && msg.includes('6 characters')) {
    return 'Password must be at least 6 characters.';
  }
  if (msg.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Connection issue — check your internet and try again.';
  }
  return 'Something went wrong. Please try again.';
}

type Mode = 'signin' | 'signup';

interface Field {
  name: string;
  label: string;
  type: string;
  placeholder: string;
  show?: boolean;
}

function FloatingInput({
  name,
  label,
  type,
  value,
  onChange,
  isPassword = false,
}: {
  name: string;
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isPassword?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const elevated = focused || value.length > 0;

  return (
    <div style={{ position: 'relative', marginBottom: 24 }}>
      {/* Floating label */}
      <label
        style={{
          position: 'absolute',
          left: 16,
          top: elevated ? 8 : 16,
          fontSize: elevated ? 8 : 12,
          letterSpacing: elevated ? 3 : 1,
          fontFamily: 'var(--mono)',
          textTransform: 'uppercase',
          color: focused ? 'var(--accent)' : 'var(--fg-muted)',
          pointerEvents: 'none',
          transition: 'all 0.25s var(--ease-expo)',
        }}
      >
        {label}
      </label>

      <input
        name={name}
        type={isPassword ? (showPw ? 'text' : 'password') : type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={isPassword ? 'current-password' : name}
        style={{
          width: '100%',
          paddingTop: elevated ? 24 : 16,
          paddingBottom: elevated ? 8 : 16,
          paddingLeft: 16,
          paddingRight: isPassword ? 48 : 16,
          background: 'rgba(255,255,255,0.02)',
          border: `1px solid ${focused ? 'rgba(215,52,11,0.5)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 'var(--radius-sm)',
          color: 'var(--fg)',
          fontFamily: 'var(--mono)',
          fontSize: 13,
          letterSpacing: 0.5,
          outline: 'none',
          transition: 'border-color 0.3s, box-shadow 0.3s',
          boxShadow: focused ? '0 0 0 3px rgba(215,52,11,0.05)' : 'none',
        }}
      />

      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPw(!showPw)}
          style={{
            position: 'absolute',
            right: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'var(--fg-muted)',
            padding: 4,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-muted)')}
        >
          {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      )}
    </div>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmSent, setConfirmSent] = useState(false);

  const [form, setForm] = useState({ email: '', username: '', password: '' });

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.email.trim() || !form.password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    if (mode === 'signup' && !form.username.trim()) {
      setError('Please choose a username.');
      return;
    }
    if (mode === 'signup' && form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!isSupabaseConfigured) {
      setError('Sign-in is not configured for this environment yet.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        // Supabase client persists the session; AuthProvider picks it up via
        // onAuthStateChange and the whole app reflects the logged-in state.
        await signIn(form.email, form.password);
        toast('Welcome back.', 'success');
        setTimeout(() => router.push('/'), 500);
      } else {
        const data = await signUp(form.email, form.password, form.username);
        if (data?.session) {
          // Email confirmation is disabled → already logged in.
          toast('Account created.', 'success');
          setTimeout(() => router.push('/'), 500);
        } else {
          // Email confirmation required → no session yet.
          setConfirmSent(true);
          toast('Check your email to confirm your account.', 'success');
        }
      }
    } catch (err: any) {
      setError(friendlyAuthError(err?.message || ''));
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

      {/* Background orb */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 40%, rgba(215,52,11,0.05) 0%, transparent 60%)',
      }} />

      {/* Back to home */}
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

        {/* Logo */}
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

        {/* Card */}
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
          {/* Mode toggle */}
          {confirmSent ? (
            <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
              <div style={{
                width: 56, height: 56, margin: '0 auto 22px', borderRadius: '50%',
                background: 'rgba(215,52,11,0.12)', border: '1px solid rgba(215,52,11,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
              }}>✉️</div>
              <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.6rem', letterSpacing: 2, marginBottom: 12 }}>
                Confirm your email
              </h2>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.7, color: 'var(--fg-muted)', marginBottom: 28 }}>
                We sent a confirmation link to<br />
                <span style={{ color: 'var(--fg)' }}>{form.email}</span>.<br />
                Click it, then sign in.
              </p>
              <button
                onClick={() => { setConfirmSent(false); setMode('signin'); }}
                style={{
                  width: '100%', padding: '14px', background: 'var(--accent)', color: '#040710',
                  border: 'none', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 3,
                  textTransform: 'uppercase', fontWeight: 600, borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
              >
                Back to Sign In
              </button>
            </div>
          ) : (
          <>
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
            <FloatingInput
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
                  <FloatingInput
                    name="username"
                    label="Username"
                    type="text"
                    value={form.username}
                    onChange={handleChange}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <FloatingInput
              name="password"
              label="Password"
              type="password"
              value={form.password}
              onChange={handleChange}
              isPassword
            />

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(215,52,11,0.08)',
                    border: '1px solid rgba(215,52,11,0.2)',
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

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={!loading ? { y: -2, scale: 1.01 } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
              style={{
                width: '100%',
                padding: '15px',
                background: loading ? 'rgba(215,52,11,0.6)' : 'var(--accent)',
                border: 'none',
                color: 'var(--bg)',
                fontFamily: 'var(--mono)',
                fontSize: 10,
                letterSpacing: 4,
                textTransform: 'uppercase',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'background 0.3s',
              }}
            >
              {loading && <Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} />}
              {loading ? 'One moment...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </motion.button>
          </form>

          {/* Divider */}
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
              await supabase.auth.signInWithOAuth({
                provider: 'discord',
                options: { redirectTo: `${window.location.origin}/auth/callback` }
              });
            }}
            style={{ width: '100%', padding: '14px', background: 'rgba(88,101,242,0.12)', border: '1px solid rgba(88,101,242,0.4)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.2s', marginTop: 24, borderRadius: 'var(--radius-sm)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(88,101,242,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(88,101,242,0.12)'}>
            <svg width="16" height="12" viewBox="0 0 71 55" fill="#5865f2"><path d="M60.1 4.9A58.5 58.5 0 0045.6 0a40 40 0 00-1.8 3.7 54.1 54.1 0 00-16.2 0A38.5 38.5 0 0025.9 0 58.3 58.3 0 0011.3 5C1.6 19.6-1 33.8.3 47.9a58.8 58.8 0 0017.9 9 44 44 0 003.8-6.2 38.3 38.3 0 01-6-2.9l1.5-1.2a41.9 41.9 0 0036.2 0l1.5 1.2a38.3 38.3 0 01-6 2.9 44 44 0 003.8 6.2 58.6 58.6 0 0017.9-9C72 31.6 68.3 17.5 60.1 4.9zM23.7 39.4c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2 6.5 3.2 6.4 7.2c0 4-2.8 7.2-6.4 7.2zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2 6.5 3.2 6.4 7.2c0 4-2.9 7.2-6.4 7.2z"/></svg>
            CONTINUE WITH DISCORD
          </button>

          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/auth/callback` }
              });
            }}
            style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.2s', marginTop: 12, borderRadius: 'var(--radius-sm)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}>
            <svg width="15" height="15" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22 22-9.8 22-22c0-1.5-.2-2.7-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 4.1 29.6 2 24 2 16.3 2 9.7 6.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 46c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.6 36.6 26.9 38 24 38c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 41.6 16.2 46 24 46z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C42.9 35.9 46 30.5 46 24c0-1.5-.2-2.7-.4-3.5z"/></svg>
            CONTINUE WITH GOOGLE
          </button>
          </>
          )}

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
