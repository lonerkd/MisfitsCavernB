'use client';

// Unified auth: re-export the real Supabase-backed auth context.
// (Previously this read a `user` blob from localStorage that nothing wrote,
// so it always reported logged-out. Kept as a thin re-export for compatibility.)
export { useAuth, AuthProvider } from '@/lib/context/AuthContext';
export type { Profile } from '@/lib/context/AuthContext';
