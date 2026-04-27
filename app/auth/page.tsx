'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = mode === 'signin' ? '/api/auth/signin' : '/api/auth/signup';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'signin'
            ? { email: formData.email, password: formData.password }
            : formData
        ),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Authentication failed');
      }

      const user = await response.json();
      localStorage.setItem('user', JSON.stringify(user));
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/5 border border-white/10 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            MISFITS CAVERN
          </h1>
          <p className="text-white/60 mb-8">
            {mode === 'signin'
              ? 'Sign in to your creative workspace'
              : 'Create your creator profile'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/80 text-sm mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white placeholder:text-white/40"
                placeholder="you@example.com"
                required
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-white/80 text-sm mb-2">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white placeholder:text-white/40"
                  placeholder="lonerkid"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-white/80 text-sm mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white placeholder:text-white/40"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <div className="text-red-400 text-sm">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold py-2 rounded transition"
            >
              {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-white/60 text-sm text-center">
              {mode === 'signin'
                ? "Don't have an account? "
                : 'Already have an account? '}
              <button
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setError('');
                }}
                className="text-orange-400 hover:text-orange-300 font-semibold"
              >
                {mode === 'signin' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>

          <div className="mt-6">
            <Link
              href="/"
              className="text-white/40 hover:text-white/60 text-sm text-center block"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
