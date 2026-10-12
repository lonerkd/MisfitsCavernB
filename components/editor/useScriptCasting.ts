'use client';

// Who plays each character in the open project (character_castings), and the
// project's people to cast from. Loaded per project; `castCharacter` sets or
// clears one casting, and says why when it can't.

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useOnChange } from '@/lib/hooks/useOnChange';
import { awaitOSUser } from '@/lib/os';
import { getCastingsForProject, removeCasting, setCasting, type Casting } from '@/lib/supabase/casting';
import { getProjectCrew, type CrewMember } from '@/lib/supabase/crew-management';

export function useScriptCasting(projectId: string | undefined) {
  const { toast } = useToast();
  const [castings, setCastings] = useState<Record<string, Casting>>({});
  const [projectCrew, setProjectCrew] = useState<CrewMember[]>([]);

  // No project, no casting; a project's own load in the effect below.
  useOnChange(projectId, (id) => { if (!id) { setCastings({}); setProjectCrew([]); } });
  useEffect(() => {
    if (!projectId) return;
    getCastingsForProject(projectId).then(setCastings).catch(console.error);
    getProjectCrew(projectId).then(setProjectCrew).catch(console.error);
  }, [projectId]);

  /** An empty `crewUserId` clears the casting. */
  const castCharacter = useCallback(async (characterName: string, crewUserId: string) => {
    if (!projectId) return;
    try {
      const auth = { user: await awaitOSUser() };
      if (!auth.user) return;
      if (!crewUserId) {
        await removeCasting(projectId, characterName);
        setCastings((prev) => { const next = { ...prev }; delete next[characterName.toUpperCase()]; return next; });
        return;
      }
      await setCasting(projectId, characterName, crewUserId, auth.user.id);
      setCastings(await getCastingsForProject(projectId));
    } catch (e: unknown) {
      toast((e as { message?: string } | null)?.message || 'Could not update casting', 'error');
    }
  }, [projectId, toast]);

  return { castings, projectCrew, castCharacter };
}
