'use client';

import { useCallback, useState } from 'react';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'error' | 'info' | 'success';
}

export function useToast() {
  const [toasts, setToasts] = useState<Record<string, ToastOptions>>({});

  const toast = useCallback((options: Omit<ToastOptions, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => ({ ...prev, [id]: { ...options, id } }));
    setTimeout(() => {
      setToasts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 5000);
    return id;
  }, []);

  return toast;
}
