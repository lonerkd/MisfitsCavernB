// Story beat → script (BACKLOG 3.8). A beat from the Studio's beat board is
// added to the end of the project's script as a Fountain section with its
// synopsis — writer's notes that don't print — for the writer to turn into
// scenes. Safe with the script open elsewhere:
//   1. the server appends in one statement (append_to_script), so it can't
//      race a whole-document save;
//   2. an `append` broadcast on the script's channel makes every open editor
//      add the same text to its own copy (lib/scriptos/sync.ts), so a
//      co-writer's unsaved typing is kept and their next save carries it.
import { supabase } from '@/lib/supabase/client';
import { createProjectScript, latestScriptId } from '@/lib/supabase/scripts';
import { updateProjectBeat } from '@/lib/supabase/studio';
import { defaultScriptFormat, findFormat, loadFormats } from '@/lib/formats';

export const APPEND_EVENT = 'append';

/** A beat as Fountain: a section (its title) and synopsis lines (what happens), set off by a blank line. */
export function beatAsFountain(beat: { title: string | null; content: string | null }): string {
  const title = (beat.title ?? '').replace(/\s+/g, ' ').trim() || 'Untitled beat';
  const synopsis = (beat.content ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `= ${l}`);
  return `\n\n# ${title}\n${synopsis.length ? `${synopsis.join('\n')}\n` : ''}`;
}

/** Tells editors with the script open to add `text` to the end of their copy. */
export async function broadcastAppend(scriptId: string, text: string): Promise<void> {
  const channel = supabase.channel(`script_${scriptId}`, { config: { broadcast: { self: false } } });
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 4000);
    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { clearTimeout(timer); resolve(); }
    });
  });
  try {
    await channel.send({ type: 'broadcast', event: APPEND_EVENT, payload: { text } });
  } finally {
    void supabase.removeChannel(channel);
  }
}

/**
 * Adds a beat to the end of the project's script (starting one if the
 * project has none), tells open editors, and records on the beat which
 * script it went to. Returns that script's id.
 */
export async function pushBeatToScript(
  beat: { id: string; title: string | null; content: string | null },
  project: { id: string; title: string; type?: string; settings?: { defaultScriptFormat?: string } },
  userId: string,
): Promise<string> {
  let scriptId = await latestScriptId(project.id);
  if (!scriptId) {
    // Started the way the editor starts a project's script: in the project's format.
    const format = defaultScriptFormat(findFormat(await loadFormats().catch(() => []), project.type), project.settings?.defaultScriptFormat);
    scriptId = (await createProjectScript({ projectId: project.id, title: project.title, format, userId })).id;
  }
  const text = beatAsFountain(beat);
  const { error } = await supabase.rpc('append_to_script', { p_script: scriptId, p_text: text });
  if (error) throw error;
  await broadcastAppend(scriptId, text);
  await updateProjectBeat(beat.id, { script_id: scriptId });
  return scriptId;
}
