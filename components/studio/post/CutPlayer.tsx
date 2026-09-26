'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { videoEmbed, type Media, type PostCut } from '@/lib/studio';
import s from '../studio.module.css';

export interface CutPlayerHandle {
  /** Current position in seconds, or null when the player can't report it. */
  time: () => number | null;
  seek: (seconds: number) => void;
}

const YT_ORIGIN = 'https://www.youtube-nocookie.com';
const VIMEO_ORIGIN = 'https://player.vimeo.com';

/**
 * Plays a cut and reports/sets its position so notes can be timecoded:
 * library videos via the <video> element, YouTube and Vimeo via their player
 * message APIs. Google Drive and other links play but can't report time.
 */
export const CutPlayer = forwardRef<CutPlayerHandle, {
  cut: PostCut; media?: Media; fileUrl?: string | null; onLive?: (live: boolean) => void;
}>(function CutPlayer({ cut, media, fileUrl, onLive }, ref) {
  const video = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const time = useRef<number | null>(null);
  const [live, setLive] = useState(false);

  const url = cut.url ?? media?.external_url ?? null;
  const embed = videoEmbed(url);
  const file = cut.media_id && media?.storage_path ? fileUrl ?? null : null;

  useEffect(() => { onLive?.(live); }, [live, onLive]);
  useEffect(() => { time.current = null; setLive(!!file); }, [cut.id, file]);

  // YouTube / Vimeo: subscribe to time updates over postMessage.
  useEffect(() => {
    if (!embed || embed.provider === 'drive') return;
    const origin = embed.provider === 'youtube' ? YT_ORIGIN : VIMEO_ORIGIN;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== origin || e.source !== frame.current?.contentWindow) return;
      let data: any;
      try { data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
      const t = embed.provider === 'youtube'
        ? (data?.event === 'infoDelivery' ? data.info?.currentTime : undefined)
        : (data?.event === 'timeupdate' || data?.event === 'playProgress' ? data.data?.seconds : undefined);
      if (typeof t === 'number') { time.current = t; setLive(true); }
      if (embed.provider === 'vimeo' && data?.event === 'ready') subscribe();
    };
    const post = (msg: unknown) => frame.current?.contentWindow?.postMessage(JSON.stringify(msg), origin);
    const subscribe = () => {
      if (embed.provider === 'youtube') post({ event: 'listening', id: cut.id, channel: 'widget' });
      else { post({ method: 'addEventListener', value: 'timeupdate' }); post({ method: 'addEventListener', value: 'playProgress' }); }
    };
    window.addEventListener('message', onMessage);
    // The player may not be ready on the first try; keep asking briefly.
    let tries = 0;
    const timer = window.setInterval(() => { if (time.current !== null || ++tries > 20) window.clearInterval(timer); else subscribe(); }, 500);
    return () => { window.removeEventListener('message', onMessage); window.clearInterval(timer); };
  }, [embed?.provider, embed?.id, cut.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    time: () => (file ? video.current?.currentTime ?? null : time.current),
    seek: (t: number) => {
      if (file && video.current) { video.current.currentTime = t; void video.current.play().catch(() => {}); return; }
      if (!embed) return;
      if (embed.provider === 'youtube') frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [t, true], id: cut.id, channel: 'widget' }), YT_ORIGIN);
      if (embed.provider === 'vimeo') frame.current?.contentWindow?.postMessage(JSON.stringify({ method: 'setCurrentTime', value: t }), VIMEO_ORIGIN);
    },
  }), [file, embed, cut.id]);

  if (file) {
    return <video ref={video} className={s.cutFrame} src={file} controls preload="metadata" />;
  }
  if (embed) {
    const src = embed.provider === 'youtube'
      ? `${embed.src}?enablejsapi=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`
      : embed.src;
    return (
      <iframe
        ref={frame}
        key={cut.id}
        className={s.cutFrame}
        src={src}
        title={cut.title}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    );
  }
  return (
    <div className={s.cutFrame} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {url ? <a href={url} target="_blank" rel="noopener noreferrer" className={s.btn}><ExternalLink size={12} /> Open the cut</a> : <span className={s.hint}>This cut has no playable source.</span>}
    </div>
  );
});
