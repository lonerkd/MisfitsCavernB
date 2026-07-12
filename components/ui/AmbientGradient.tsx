'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface AmbientGradientProps {
  color?: string | null;
  intensity?: number;
  position?: 'top' | 'center' | 'bottom';
  className?: string;
}

export function AmbientGradient({
  color,
  intensity = 0.15,
  position = 'center',
  className = '',
}: AmbientGradientProps) {
  const yPos = position === 'top' ? '20%' : position === 'bottom' ? '80%' : '50%';

  const baseColor = color || 'rgba(215, 52, 11, 1)';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        background: `radial-gradient(ellipse at 50% ${yPos}, ${baseColor} 0%, transparent 60%)`
      }}
      transition={{ duration: 1.5, ease: 'easeOut' }}
      className={`absolute inset-0 pointer-events-none z-0 mix-blend-screen ${className}`}
      style={{
        opacity: intensity,
        filter: 'blur(40px)',
      }}
    />
  );
}
