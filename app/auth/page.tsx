'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Loader } from 'lucide-react';
import GrainOverlay from '@/components/GrainOverlay';
import { useToast } from '@/components/Toast';

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
        type={isPassword && !showPw ? 'password' : 'text'}
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
          border: `1px solid ${focused ? 'rgba(255,60,0,0.5)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 'var(--radius-sm)',
          color: 'var(--fg)',
          fontFamily: 'var(--mono)',
          fontSize: 13,
          letterSpacing: 0.5,
          outline: 'none',
          transition: 'border-color 0.3s, box-shadow 0.3s',
          boxShadow: focused ? '0 0 0 3px rgba(255,60,0,0.05)' : 'none',
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

  const [form, setForm] = useState({ email: '', username: '', password: '' });

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = mode === 'signin' ? '/api/auth/signin' : '/api/auth/signup';
      const body = mode === 'signin'
        ? { email: form.email, password: form.password }
        : form;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Authentication failed');
      }

      const user = await res.json();
      localStorage.setItem('user', JSON.stringify(user));
      toast(mode === 'signin' ? 'Welcome back.' : 'Account created.', 'success');
      setTimeout(() => router.push('/'), 600);
    } catch (err: any) {
      setError(err.message);
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
        background: 'radial-gradient(ellipse at 50% 40%, rgba(255,60,0,0.05) 0%, transparent 60%)',
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
                    background: 'rgba(255,60,0,0.08)',
                    border: '1px solid rgba(255,60,0,0.2)',
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
                background: loading ? 'rgba(255,60,0,0.6)' : 'var(--accent)',
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
