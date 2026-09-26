'use client';

import React, { useMemo } from 'react';
import { useSignedUrls, mediaSrc } from '@/lib/studio';
import { ProjectPitchDeck, type PitchImage } from '../PitchDeck';
import { useStudio } from '../StudioContext';

/** In-app pitch deck for presenting in the room. (The share link is the send-ahead version.) */
export function PitchTab() {
  const { project, media, scriptId } = useStudio();
  // Published images first — they're the ones chosen to represent the project.
  const images = useMemo(
    () => media.rows.filter((m) => m.kind === 'image').sort((a, b) => Number(b.shared) - Number(a.shared)),
    [media.rows],
  );
  const signed = useSignedUrls(images.slice(0, 6).map((m) => m.storage_path));
  const concepts: PitchImage[] = images
    .map((m) => ({ id: m.id, image_url: mediaSrc(m, signed) ?? '', title: m.title }))
    .filter((c) => c.image_url);

  return <ProjectPitchDeck project={project} concepts={concepts} beats={project.beats ?? []} scriptId={scriptId} />;
}
