'use client';

import { useCallback, useState } from 'react';
import { studio, uploadProblem, type Media, type MediaMeta } from '@/lib/studio';

export interface UploadItem {
  key: string;
  name: string;
  state: 'uploading' | 'failed';
  error?: string;
  file: File;
}

/** Width/height/duration read in the browser, so layouts know the aspect ratio. */
async function readMeta(file: File): Promise<MediaMeta> {
  try {
    if (file.type.startsWith('image/') && typeof createImageBitmap === 'function') {
      const bmp = await createImageBitmap(file);
      const meta = { width: bmp.width, height: bmp.height };
      bmp.close();
      return meta;
    }
    if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
      const url = URL.createObjectURL(file);
      try {
        const el = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio');
        el.preload = 'metadata';
        el.src = url;
        await new Promise<void>((resolve) => {
          const done = () => resolve();
          el.onloadedmetadata = done;
          el.onerror = done;
          setTimeout(done, 4000);
        });
        const v = el as HTMLVideoElement;
        return {
          duration_seconds: Number.isFinite(el.duration) ? Math.round(el.duration * 10) / 10 : null,
          width: v.videoWidth || null,
          height: v.videoHeight || null,
        };
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  } catch { /* metadata is a nicety; the upload still proceeds */ }
  return {};
}

/**
 * Upload queue for the project library. Files upload one at a time (steady on
 * weak connections); each shows until it succeeds, and a failure stays listed
 * with its reason and a retry.
 */
export function useUploader(projectId: string | null, userId: string | null, onUploaded: (m: Media) => void, board?: string | null) {
  const [queue, setQueue] = useState<UploadItem[]>([]);

  const runOne = useCallback(async (item: UploadItem) => {
    if (!projectId || !userId) return;
    setQueue((q) => q.map((x) => (x.key === item.key ? { ...x, state: 'uploading', error: undefined } : x)));
    try {
      const meta = await readMeta(item.file);
      const media = await studio.uploadFile(projectId, userId, item.file, { meta, board });
      setQueue((q) => q.filter((x) => x.key !== item.key));
      onUploaded(media);
    } catch (e) {
      setQueue((q) => q.map((x) => (x.key === item.key ? { ...x, state: 'failed', error: e instanceof Error ? e.message : 'Upload failed' } : x)));
    }
  }, [projectId, userId, onUploaded, board]);

  const add = useCallback(async (files: FileList | File[]) => {
    const items: UploadItem[] = Array.from(files).map((file) => {
      const problem = uploadProblem(file);
      return { key: `${file.name}:${file.size}:${Math.random().toString(36).slice(2)}`, name: file.name, file, state: problem ? 'failed' : 'uploading', error: problem ?? undefined };
    });
    setQueue((q) => [...q, ...items]);
    for (const item of items) if (item.state === 'uploading') await runOne(item);
  }, [runOne]);

  const retry = useCallback((key: string) => {
    const item = queue.find((x) => x.key === key);
    if (item && !uploadProblem(item.file)) void runOne(item);
  }, [queue, runOne]);

  const dismiss = useCallback((key: string) => setQueue((q) => q.filter((x) => x.key !== key)), []);

  return { queue, add, retry, dismiss, busy: queue.some((x) => x.state === 'uploading') };
}
