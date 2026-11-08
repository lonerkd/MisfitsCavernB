'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Disc, Folder, Music, Play, Tag, Trash, UploadCloud, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useSpotify } from '@/lib/os/SpotifyContext';
import { TrackTagger } from '@/components/audio/TrackTagger';
import { allTags, buildLibrary, filterLibrary, NO_FILTER, type LibraryFilter, type LibraryItem } from '@/lib/audio/library';
import {
  AUDIO_ROLES, audioRefUrl, deleteAudioRef, listAudioRefs, listProjectSfx, listSceneChoices, tagAudioRef, uploadSfx,
  type AudioReference, type AudioRole, type SfxAsset,
} from '@/lib/supabase/audio';

const select = 'mc-text text-xs rounded-full border border-[rgba(var(--ink-rgb),0.14)] bg-[var(--bg)] text-[var(--fg)] px-3 min-h-[44px]';

/**
 * The Sound page's Library: everything the project owns in sound in one list: saved songs, uploaded sound files and the
 * project's sound effects. Filter by kind, role, scene and tag; tag in place (owners and writers); play, remove; upload.
 */
export function SoundLibrary({ projectId, projectTitle, userId, canTag }: { projectId: string; projectTitle: string; userId: string | null; canTag: boolean }) {
  const { toast } = useToast();
  const { playUri } = useSpotify();
  const [data, setData] = useState<{ projectId: string; refs: AudioReference[]; sfx: SfxAsset[]; scenes: { id: string; label: string }[] } | null>(null);
  const [filter, setFilter] = useState<LibraryFilter>(NO_FILTER);
  const [tagging, setTagging] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const [refs, sfx, scenes] = await Promise.all([listAudioRefs(projectId), listProjectSfx(projectId), listSceneChoices(projectId)]);
      setData({ projectId, refs, sfx, scenes });
    } catch {
      toast('Could not load the project’s sound library.', 'error');
      setData({ projectId, refs: [], sfx: [], scenes: [] });
    }
  }, [projectId, toast]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the project's library when it comes into view
  useEffect(() => { void load(); }, [load]);

  const ready = data && data.projectId === projectId ? data : null;
  const items = useMemo(() => (ready ? buildLibrary(ready.refs, ready.sfx) : []), [ready]);
  const shown = useMemo(() => filterLibrary(items, filter), [items, filter]);
  const tags = useMemo(() => allTags(items), [items]);
  const sceneLabel = (id: string | null) => (id ? ready?.scenes.find((sc) => sc.id === id)?.label ?? 'A deleted scene' : null);
  const filtered = JSON.stringify(filter) !== JSON.stringify(NO_FILTER);

  const play = (i: LibraryItem) => {
    if (i.kind === 'song') { void playUri(i.uri); return; }
    new Audio(audioRefUrl(i.uri)).play().catch(() => toast('This file would not play.', 'error'));
  };
  const remove = async (i: LibraryItem) => {
    if (!i.refId) return;
    try { await deleteAudioRef(i.refId); } catch (e) { toast('Could not remove it: ' + (e instanceof Error ? e.message : 'unknown error'), 'error'); return; }
    toast('Removed from the library', 'success');
    void load();
  };
  const retag = async (i: LibraryItem, t: { sceneId: string | null; role: AudioRole | null; tags: string[] }) => {
    try {
      await tagAudioRef(i.refId!, t);
      toast('Tags saved', 'success');
      void load();
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not save the tags', 'error'); throw e; }
  };
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      if (!userId) throw new Error('Sign in first');
      if (!file.type.startsWith('audio/')) throw new Error('Sound files must be audio');
      if (file.size > 20 * 1024 * 1024) throw new Error('Sound files are limited to 20 MB');
      await uploadSfx(file, userId, projectId);
      toast('Added to the library', 'success');
      void load();
    } catch (err) {
      toast('Upload failed: ' + (err instanceof Error ? err.message : 'unknown error'), 'error');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[rgba(var(--ink-rgb),0.1)]">
        <div className="flex items-center gap-3">
          <Folder size={20} className="opacity-60" aria-hidden />
          <div>
            <h2 className="mc-title text-2xl">{projectTitle} library</h2>
            <p className="mc-text text-sm text-[var(--fg-dim)]">{ready ? `${items.length} item${items.length === 1 ? '' : 's'}: songs, sound files and effects` : 'Loading…'}</p>
          </div>
        </div>
        <div>
          <input type="file" accept="audio/*" className="hidden" ref={fileInput} onChange={upload} aria-label="Upload a sound file" />
          <Button variant="solid" className="gap-2" onClick={() => fileInput.current?.click()} isLoading={uploading}>
            <UploadCloud size={16} /> Upload sound
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter the library">
        <input
          type="search" value={filter.text} placeholder="Search the library" aria-label="Search the library"
          onChange={(e) => setFilter({ ...filter, text: e.target.value })}
          className={`${select} min-w-[200px]`}
        />
        <select aria-label="Kind" value={filter.kind} onChange={(e) => setFilter({ ...filter, kind: e.target.value as LibraryFilter['kind'] })} className={select}>
          <option value="all">All kinds</option><option value="song">Songs</option><option value="sound">Sound files</option>
        </select>
        <select aria-label="Role" value={filter.role} onChange={(e) => setFilter({ ...filter, role: e.target.value })} className={select}>
          <option value="all">Any role</option><option value="none">No role</option>
          {(Object.entries(AUDIO_ROLES) as Array<[AudioRole, string]>).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select aria-label="Scene" value={filter.scene} onChange={(e) => setFilter({ ...filter, scene: e.target.value })} className={select}>
          <option value="all">Any scene</option><option value="none">Not in a scene</option>
          {ready?.scenes.map((sc) => <option key={sc.id} value={sc.id}>{sc.label}</option>)}
        </select>
        {filtered && <Button variant="outline" onClick={() => setFilter(NO_FILTER)}>Clear filters</Button>}
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by tag">
          {tags.map((t) => {
            const on = filter.tag?.toLowerCase() === t.toLowerCase();
            return (
              <button key={t} type="button" aria-pressed={on} onClick={() => setFilter({ ...filter, tag: on ? null : t })}
                className={`mc-text text-xs rounded-full px-3 min-h-[44px] border ${on ? 'bg-[var(--accent)] text-[var(--on-accent)] border-transparent' : 'border-[rgba(var(--ink-rgb),0.14)] text-[var(--fg-muted)]'}`}>{t}</button>
            );
          })}
        </div>
      )}

      {!ready ? (
        <div className="animate-pulse h-16 w-full rounded-xl bg-[var(--sunken)]" />
      ) : items.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-[rgba(var(--ink-rgb),0.1)] text-center">
          <Music size={32} className="opacity-20 mb-4 mx-auto" />
          <h3 className="mc-title text-lg mb-2">The library is empty</h3>
          <p className="mc-text text-sm text-[var(--fg-dim)]">Find a song and save it, or upload a sound file, and it lives here.</p>
        </div>
      ) : shown.length === 0 ? (
        <p className="mc-text text-[var(--fg-dim)]">Nothing matches these filters.</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shown.map((i) => (
            <li key={i.key} className="p-4 rounded-xl border border-[rgba(var(--ink-rgb),0.06)] bg-[var(--sunken)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-4 overflow-hidden">
                  <button type="button" aria-label={`Play ${i.title}`} onClick={() => play(i)}
                    className="w-11 h-11 shrink-0 rounded-full bg-[rgba(var(--ink-rgb),0.05)] flex items-center justify-center hover:bg-[rgba(var(--ink-rgb),0.1)] transition-colors">
                    <Play size={16} />
                  </button>
                  <div className="min-w-0">
                    <h4 className="mc-title text-sm truncate">{i.title}</h4>
                    <p className="mc-text text-xs text-[var(--fg-dim)] truncate flex items-center gap-1">
                      {i.kind === 'song' ? <Disc size={10} aria-hidden /> : <Volume2 size={10} aria-hidden />}
                      {i.subtitle || (i.kind === 'song' ? 'Spotify' : 'Sound file')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {canTag && i.refId && (
                    <button type="button" aria-label={`Tag ${i.title}`} onClick={() => setTagging(tagging === i.key ? null : i.key)}
                      className="w-11 h-11 rounded flex items-center justify-center hover:bg-[rgba(var(--ink-rgb),0.1)] text-[var(--fg-dim)] hover:text-[var(--fg-strong)]"><Tag size={16} /></button>
                  )}
                  {i.refId && (
                    <button type="button" aria-label={`Remove ${i.title}`} onClick={() => void remove(i)}
                      className="w-11 h-11 rounded flex items-center justify-center hover:bg-[rgba(var(--ink-rgb),0.1)] text-[var(--fg-dim)] hover:text-[var(--fg-strong)]"><Trash size={16} /></button>
                  )}
                </div>
              </div>
              {(i.role || i.sceneId || i.tags.length > 0) && (
                <p className="mc-text text-xs text-[var(--fg-dim)] mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {i.role && <span>{AUDIO_ROLES[i.role as AudioRole] ?? i.role}</span>}
                  {i.sceneId && <span>{sceneLabel(i.sceneId)}</span>}
                  {i.tags.map((t) => <span key={t} className="rounded border border-[rgba(var(--ink-rgb),0.14)] px-1.5">{t}</span>)}
                </p>
              )}
              {canTag && i.refId && tagging === i.key && (
                <TrackTagger track={{ role: i.role, for_scene: i.sceneId, tags: i.tags }} scenes={ready?.scenes ?? []} onSave={(t) => retag(i, t)} onClose={() => setTagging(null)} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
