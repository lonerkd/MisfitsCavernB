'use client';

import React, { useCallback, useState } from 'react';
import { Archive, Link2, Search, StickyNote } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import type { Media } from '@/lib/studio';
import { useStudio } from '../StudioContext';
import { ErrorBar } from '../ui';
import { TabHeader } from '../TabHeader';
import { MediaFilters, MediaGrid, GridSkeleton, useMediaFilters } from '../media/MediaGrid';
import { AddLinkForm, AddNoteForm, DropOverlay, UploadButton, UploadQueue, useFileDrop } from '../media/AddMedia';
import { MediaDetail } from '../media/MediaDetail';
import { useUploader } from '../media/useUploader';
import { FindReferences } from '../media/FindReferences';
import { BoardsPanel } from '../boards/BoardsPanel';
import s from '../studio.module.css';

/**
 * The project library: every reference photo, clip, track, PDF, link and note
 * the team has gathered — at the desk or captured on a phone. Shared with all
 * crew, live.
 */
export function LibraryTab() {
  const [view, setView] = useState<'library' | 'boards'>(() => (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('view') === 'boards' ? 'boards' : 'library'));
  const { project, userId, media, scenesByMedia } = useStudio();
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [writing, setWriting] = useState(false);
  const [finding, setFinding] = useState(false);
  const f = useMediaFilters(media.rows);

  const onUploaded = useCallback((m: Media) => media.upsertLocal(m), [media]);
  const uploader = useUploader(project.id, userId, onUploaded, f.board);
  const dragging = useFileDrop((files) => void uploader.add(files), !openId && !finding);

  const count = media.rows.length;
  return (
    <section aria-labelledby="library-title">
      <div role="tablist" aria-label="Library views" style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {(['library', 'boards'] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} className={s.btn} style={view === v ? { borderColor: 'var(--accent)' } : undefined} onClick={() => setView(v)}>{v === 'library' ? 'Library' : 'Mood boards'}</button>
        ))}
      </div>
      {view === 'boards' ? <BoardsPanel /> : (<>
      <TabHeader
        id="library-title"
        title="References & Media"
        tool={{ icon: <Archive size={16} />, eyebrow: 'Studio', accent: project.accent_color, purpose: count ? `${count} item${count === 1 ? '' : 's'}: images, clips, audio, links and notes for the look.` : 'Images, clips, audio, links and notes for the look and feel.' }}
        actions={
          <>
            <button type="button" className={s.btn} onClick={() => setFinding(true)}>
              <Search size={12} /> Find references
            </button>
            <button type="button" className={s.btn} aria-expanded={writing} onClick={() => { setWriting((w) => !w); setAdding(false); }}>
              <StickyNote size={12} /> Note
            </button>
            <button type="button" className={s.btn} aria-expanded={adding} onClick={() => { setAdding((a) => !a); setWriting(false); }}>
              <Link2 size={12} /> Add link
            </button>
            <UploadButton onFiles={(files) => void uploader.add(files)} />
          </>
        }
      />
      {adding && <AddLinkForm projectId={project.id} userId={userId} board={f.board} onAdded={onUploaded} onCancel={() => setAdding(false)} />}
      {writing && <AddNoteForm projectId={project.id} userId={userId} board={f.board} onAdded={onUploaded} onCancel={() => setWriting(false)} />}
      <UploadQueue queue={uploader.queue} onRetry={uploader.retry} onDismiss={uploader.dismiss} />
      {media.status === 'error' && <ErrorBar message={media.error ?? 'Could not load the library'} onRetry={() => void media.reload()} />}

      {media.status === 'loading' ? (
        <GridSkeleton />
      ) : count === 0 ? (
        <EmptyState
          icon={<Archive size={28} />}
          title="Nothing here yet"
          subtitle="Upload a file or paste a link, then link it to scenes."
          action={<UploadButton onFiles={(files) => void uploader.add(files)} label="Upload files" />}
        />
      ) : (
        <>
          <MediaFilters f={f} />
          {f.filtered.length ? (
            <MediaGrid items={f.filtered} onOpen={(m) => setOpenId(m.id)} sceneCounts={scenesByMedia} />
          ) : (
            <EmptyState icon={<Archive size={26} />} title="No matches" subtitle="Try another filter or search." />
          )}
        </>
      )}

      {openId && <MediaDetail mediaId={openId} onClose={() => setOpenId(null)} />}
      {finding && (
        <FindReferences
          projectId={project.id}
          userId={userId}
          board={f.board}
          existingUrls={new Set(media.rows.map((m) => m.external_url).filter(Boolean) as string[])}
          onAdded={onUploaded}
          onClose={() => setFinding(false)}
        />
      )}
      {dragging && <DropOverlay label={`Drop to upload to ${project.title}`} />}
      </>)}
    </section>
  );
}
