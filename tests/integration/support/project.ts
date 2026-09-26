import type { Cast } from './personas';

/** Sam's project with Jordan confirmed as crew; Riley stays an outsider. */
export async function createCrewedProject(cast: Cast, title: string) {
  const project = await cast.sam.client
    .from('projects')
    .insert({ title, creator_id: cast.sam.id })
    .select('id, share_token')
    .single();
  if (project.error) throw project.error;

  const crew = await cast.sam.client
    .from('project_crew')
    .insert({ project_id: project.data.id, user_id: cast.jordan.id, role: 'Production Designer', status: 'confirmed' });
  if (crew.error) throw crew.error;

  return { projectId: project.data.id, shareToken: project.data.share_token };
}

export async function createScript(cast: Cast, projectId: string | null, content = '') {
  const script = await cast.sam.client
    .from('scripts')
    .insert({ title: 'Shooting Script', content, created_by: cast.sam.id, last_edited_by: cast.sam.id, project_id: projectId })
    .select('id')
    .single();
  if (script.error) throw script.error;
  return script.data.id;
}

export async function setVisibility(cast: Cast, projectId: string, visibility: 'private' | 'team' | 'link' | 'public') {
  const { error } = await cast.sam.client.from('projects').update({ visibility }).eq('id', projectId);
  if (error) throw error;
}

/** A 1×1 PNG, small enough to upload anywhere. */
export function tinyPng(): Blob {
  const bytes = Uint8Array.from(
    atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
    (c) => c.charCodeAt(0),
  );
  return new Blob([bytes], { type: 'image/png' });
}
