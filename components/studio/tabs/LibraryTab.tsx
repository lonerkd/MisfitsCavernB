'use client';

import React, { useCallback, useState } from 'react';
import { Archive, Link2, Search } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import type { Media } from '@/lib/studio';
import { useStudio } from '../StudioContext';
import { SectionHeader, ErrorBar } from '../ui';
import { MediaFilters, MediaGrid, GridSkeleton, useMediaFilters } from '../media/MediaGrid';
import { AddLinkForm, DropOverlay, UploadButton, UploadQueue, useFileDrop } from '../media/AddMedia';
import { MediaDetail } from '../media/MediaDetail';
import { useUploader } from '../media/useUploader';
import { FindReferences } from '../media/FindReferences';
import s from '../studio.module.css';

/**
 * The project library: every reference photo, clip, track, PDF and link the
 * team has gathered. Shared with all crew, live.
 */
export function LibraryTab() {
  const { project, userId, media, scenesByMedia } = useStudio();
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [finding, setFinding] = useState(false);
  const f = useMediaFilters(media.rows);

  const onUploaded = useCallback((m: Media) => media.upsertLocal(m), [media]);
  const uploader = useUploader(project.id, userId, onUploaded, f.board);
  const dragging = useFileDrop((files) => void uploader.add(files), !openId && !finding);

  const count = media.rows.length;
  return (
    <section aria-labelledby="library-title">
      <SectionHeader
        id="library-title"
        eyebrow="Library"
        title="References & Media"
        subtitle={count ? `${count} item${count === 1 ? '' : 's'} · shared with everyone on the project. Drop files anywhere to upload.` : 'Photos, clips, music and PDFs for this project — shared with your crew, linkable to any scene.'}
        actions={
          <>
            <button type="button" className={s.btn} onClick={() => setFinding(true)}>
              <Search size={12} /> Find references
            </button>
            <button type="button" className={s.btn} aria-expanded={adding} onClick={() => setAdding((a) => !a)}>
              <Link2 size={12} /> Add link
            </button>
            <UploadButton onFiles={(files) => void uploader.add(files)} />
          </>
        }
      />
      {adding && <AddLinkForm projectId={project.id} userId={userId} board={f.board} onAdded={onUploaded} onCancel={() => setAdding(false)} />}
      <UploadQueue queue={uploader.queue} onRetry={uploader.retry} onDismiss={uploader.dismiss} />
      {media.status === 'error' && <ErrorBar message={media.error ?? 'Could not load the library'} onRetry={() => void media.reload()} />}

      {media.status === 'loading' ? (
        <GridSkeleton />
      ) : count === 0 ? (
        <EmptyState
          icon={<Archive size={28} />}
          title="Nothing here yet"
          subtitle="Upload location scouts, lookbook frames, test footage or temp music — or paste a YouTube, Vimeo or image link. Then link them to scenes."
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
    </section>
  );
}
