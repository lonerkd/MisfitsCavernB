'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  createScript as sbCreateScript,
  getScript as sbGetScript,
  updateScript as sbUpdateScript,
} from '@/lib/supabase/scripts';

export interface ScriptData {
  id: string;
  project_id?: string;
  title: string;
  content: string;
  format?: string;
  status: string;
  version?: number;
  last_edited_by?: string;
  updated_at: string;
}

async function getUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
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
        const userId = await getUserId();
        if (!projectId) {
          throw new Error('A project is required to create a script');
        }

        const created = await sbCreateScript(projectId, title);
        // Persist initial content if provided
        const newScript =
          content && content.length > 0
            ? await sbUpdateScript(created.id, content, userId)
            : created;

        setScript(newScript as ScriptData);
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

  const updateScript = useCallback(
    async (id: string, data: Partial<ScriptData>) => {
      setLoading(true);
      setError(null);
      try {
        const userId = await getUserId();
        const updated = await sbUpdateScript(id, data.content ?? '', userId);
        setScript(updated as ScriptData);
        return { success: true, script: updated };
      } catch (err: any) {
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteScript = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await getUserId();
      const { error: delError } = await supabase
        .from('scripts')
        .delete()
        .eq('id', id);
      if (delError) throw delError;

      setScript(null);
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const loadScript = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await sbGetScript(id);
      setScript(loaded as ScriptData);
      return { success: true, script: loaded };
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
    loadScript,
  };
}
