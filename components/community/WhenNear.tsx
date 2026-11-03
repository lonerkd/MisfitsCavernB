'use client';

import React, { useEffect, useRef, useState } from 'react';

/** Renders its children once the spot is within a screen of the viewport, so a section far down the page fetches only when it is about to be seen. */
export function WhenNear({ children, minHeight = 160 }: { children: React.ReactNode; minHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const el = ref.current;
    if (near || !el) return;
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); } }, { rootMargin: '600px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  return <div ref={ref} style={near ? undefined : { minHeight }}>{near ? children : null}</div>;
}
