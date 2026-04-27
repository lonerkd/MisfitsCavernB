'use client';

import { useState, useCallback } from 'react';

export interface ScriptData {
  id: string;
  title: string;
  content: string;
  status: string;
  visibility: string;
  page_count: number;
  word_count: number;
  characters?: string;
  scenes?: string;
  updated_at: string;
}

export function useScript() {
  const [script, setScript] = useState<ScriptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createScript = useCallback(
    async (title: string, content: string, projectId?: string) => {
      setLoading(true);
      setError(null);
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const response = await fetch('/api/scripts/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': user.id,
          },
          body: JSON.stringify({ userId: user.id, title, content, projectId }),
        });

        if (!response.ok) {
          throw new Error('Failed to create script');
        }

        const newScript = await response.json();
        setScript(newScript);
        return { success: true, script: newScript };
      } catch (err: any) {
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateScript = useCallback(async (id: string, data: Partial<ScriptData>) => {
    setLoading(true);
    setError(null);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch(`/api/scripts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update script');
      }

      const updated = await response.json();
      setScript(updated);
      return { success: true, script: updated };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteScript = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch(`/api/scripts/${id}`, {
        method: 'DELETE',
        headers: {
          'X-User-Id': user.id,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete script');
      }

      setScript(null);
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    script,
    loading,
    error,
    createScript,
    updateScript,
    deleteScript,
  };
}
