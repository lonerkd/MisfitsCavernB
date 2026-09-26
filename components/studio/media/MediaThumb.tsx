'use client';

import React, { useState } from 'react';
import { FileText, Film, Image as ImageIcon, Link2, Music, Play } from 'lucide-react';
import { videoEmbed, type Media } from '@/lib/studio';
import s from '../studio.module.css';

const KIND_LABEL: Record<Media['kind'], string> = { image: 'Image', video: 'Video', audio: 'Audio', document: 'PDF', link: 'Link' };

export function KindIcon({ kind, size = 18 }: { kind: Media['kind']; size?: number }) {
  if (kind === 'image') return <ImageIcon size={size} />;
  if (kind === 'video') return <Film size={size} />;
  if (kind === 'audio') return <Music size={size} />;
  if (kind === 'document') return <FileText size={size} />;
  return <Link2 size={size} />;
}

export const kindLabel = (kind: Media['kind']) => KIND_LABEL[kind];

function hostOf(url: string | null) {
  try { return url ? new URL(url).hostname.replace(/^www\./, '') : ''; } catch { return ''; }
}

/**
 * The visual for a media item at thumbnail size. `src` is the displayable URL
 * (signed for files); null while it loads.
 */
export function MediaThumbVisual({ media, src }: { media: Pick<Media, 'kind' | 'title' | 'external_url' | 'storage_path'>; src: string | null }) {
  const [broken, setBroken] = useState(false);
  const embed = media.kind === 'video' && media.external_url ? videoEmbed(media.external_url) : null;

  if (media.kind === 'image' && src && !broken) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={media.title} loading="lazy" decoding="async" onError={() => setBroken(true)} />;
  }
  if (embed?.thumbnail && !broken) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={embed.thumbnail} alt={media.title} loading="lazy" onError={() => setBroken(true)} />
        <span className={s.playBadge}><Play size={9} /> {embed.provider === 'youtube' ? 'YouTube' : 'Vimeo'}</span>
      </>
    );
  }
  if (media.kind === 'video' && media.storage_path && src && !broken) {
    return (
      <>
        <video src={`${src}#t=0.5`} preload="metadata" muted playsInline onError={() => setBroken(true)} />
        <span className={s.playBadge}><Play size={9} /> Video</span>
      </>
    );
  }
  if (media.storage_path && !src && !broken) return <span className={s.spinner} aria-label="Loading" />;
  return (
    <span className={s.thumbIcon}>
      <KindIcon kind={media.kind} size={22} />
      {media.kind === 'link' || (media.external_url && media.kind !== 'image') ? hostOf(media.external_url) || kindLabel(media.kind) : kindLabel(media.kind)}
    </span>
  );
}
