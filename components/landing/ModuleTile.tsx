'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import AnimatedSection from '@/components/ui/AnimatedSection';
import { readable } from '@/lib/util/color';

interface ModuleTileProps {
  title: string;
  tag: string;
  color: string;
  href: string;
  preview: React.ReactNode;
  style?: React.CSSProperties;
  index?: number;
}

export function ModuleTile({ title, tag, color, href, preview, style, index = 0 }: ModuleTileProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <AnimatedSection delay={index * 0.08}>
      <Link href={href} aria-label={`Open ${title} — ${tag}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
        <motion.div
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
          style={{
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
            background: 'var(--bg-2)',
            border: `1px solid ${hovered ? color + '30' : 'rgba(var(--ink-rgb), 0.05)'}`,
            borderRadius: 14,
            transition: 'border-color 0.45s var(--ease-expo)',
            boxShadow: hovered ? `0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px ${color}18` : 'none',
            display: 'flex',
            flexDirection: 'column',
            ...style,
          }}
        >
          <div style={{
            position: 'absolute',
            top: -60, right: -60,
            width: 180, height: 180,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}14 0%, transparent 65%)`,
            pointerEvents: 'none',
            transition: 'opacity 0.5s',
            opacity: hovered ? 1 : 0.4,
          }} />

          <div style={{
            flex: 1,
            overflow: 'hidden',
            borderBottom: `1px solid ${hovered ? color + '20' : 'rgba(var(--ink-rgb), 0.04)'}`,
            transition: 'border-color 0.4s',
          }}>
            {preview}
          </div>

          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: 'max(7.5px, var(--mc-min-font, 0px))',
                letterSpacing: 'var(--caps-track)',
                textTransform: 'var(--caps)',
                color: readable(color),
                marginBottom: 4,
                opacity: 0.85,
              }}>
                {tag}
              </div>
              <div style={{
                fontFamily: 'var(--display)',
                fontSize: '1.5rem',
                letterSpacing: '-0.02em',
                color: 'var(--fg)',
                lineHeight: 1,
              }}>
                {title}
              </div>
            </div>
            <motion.div
              animate={{ x: hovered ? 0 : -4, opacity: hovered ? 1 : 0 }}
              transition={{ duration: 0.25 }}
              style={{ color: readable(color) }}
            >
              <ChevronRight size={18} />
            </motion.div>
          </div>
        </motion.div>
      </Link>
    </AnimatedSection>
  );
}
