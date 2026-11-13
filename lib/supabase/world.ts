import { supabase } from '@/lib/supabase/client';
import type { World } from '@/lib/world/world';

export async function getWorld(projectId: string): Promise<World | null> {
  const { data, error } = await supabase.from('worlds').select('locations, lore, rules, timeline').eq('project_id', projectId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    projectId,
    locations: (data.locations ?? []) as World['locations'],
    lore: (data.lore ?? []) as World['lore'],
    rules: (data.rules ?? []) as World['rules'],
    timeline: (data.timeline ?? []) as World['timeline'],
  };
}

export async function saveWorld(world: World) {
  const { error } = await supabase.from('worlds').upsert({
    project_id: world.projectId,
    locations: world.locations,
    lore: world.lore,
    rules: world.rules,
    timeline: world.timeline,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}
