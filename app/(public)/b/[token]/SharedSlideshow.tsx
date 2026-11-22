'use client';

// The shared board's "Slideshow" button. The presenter is loaded only when it is opened, so the page stays small.

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Presentation } from 'lucide-react';
import type { Slide } from '@/lib/studio/board-slides';
import s from './board.module.css';

const BoardSlideshow = dynamic(() => import('@/components/boards/BoardSlideshow'), { ssr: false });

export default function SharedSlideshow({ name, slides }: { name: string; slides: Slide[] }) {
  const [open, setOpen] = useState(false);
  if (!slides.length) return null;
  return (
    <>
      <button type="button" className={s.present} onClick={() => setOpen(true)}><Presentation size={15} aria-hidden /> Slideshow</button>
      {open && <BoardSlideshow name={name} slides={slides} onClose={() => setOpen(false)} />}
    </>
  );
}
