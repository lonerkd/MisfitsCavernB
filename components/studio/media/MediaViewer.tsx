'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { videoEmbed, type Media } from '@/lib/studio';
import { KindIcon } from './MediaThumb';
import s from '../studio.module.css';

/**
 * Full-size, playable view of a media item. `src` is signed for files.
 * `playerRef` gets the <video>/<audio> element of an uploaded recording (for
 * the transcript to seek and stamp times); embeds have none.
 */
export function MediaViewer({ media, src, playerRef }: { media: Pick<Media, 'kind' | 'title' | 'external_url' | 'storage_path' | 'mime_type'> & { notes?: string | null }; src: string | null; playerRef?: React.Ref<HTMLMediaElement> }) {
  if (media.kind === 'note') return <div className={s.viewer}><div className={s.noteView}>{media.notes}</div></div>;
  const embed = media.kind === 'video' && media.external_url ? videoEmbed(media.external_url) : null;

  if (embed) {
    return (
      <div className={s.viewer}>
        <iframe
          src={embed.src}
          title={media.title || 'Video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }
  if (media.storage_path && !src) {
    return <div className={s.viewer}><span className={s.spinner} aria-label="Loading" /></div>;
  }
  if (media.kind === 'image' && src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <div className={s.viewer}><img src={src} alt={media.title} /></div>;
  }
  if (media.kind === 'video' && src) {
    return <div className={s.viewer}><video ref={playerRef as React.Ref<HTMLVideoElement>} src={src} controls playsInline preload="metadata" /></div>;
  }
  if (media.kind === 'audio' && src) {
    return (
      <div className={s.viewer}>
        <div className={s.viewerFallback} style={{ width: '100%' }}>
          <KindIcon kind="audio" size={28} />
          <audio ref={playerRef as React.Ref<HTMLAudioElement>} src={src} controls preload="metadata" style={{ width: '100%', maxWidth: 'var(--w-form)' }} />
        </div>
      </div>
    );
  }
  return (
    <div className={s.viewer}>
      <div className={s.viewerFallback}>
        <KindIcon kind={media.kind} size={28} />
        <span>{media.kind === 'document' ? 'PDF document' : 'External link'}</span>
        {src && (
          <a className={s.btn} href={src} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={12} /> Open
          </a>
        )}
      </div>
    </div>
  );
}
