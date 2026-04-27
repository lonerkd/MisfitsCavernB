'use client';

import { useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  bio?: string;
  location?: string;
  tier: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
      }
    }
    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return { user, loading, logout };
}
