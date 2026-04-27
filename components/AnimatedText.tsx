'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedTextProps {
  text: string;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function AnimatedText({ text, delay = 0, className, style }: AnimatedTextProps) {
  const words = text.split(' ');

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: delay },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        damping: 12,
        stiffness: 100,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
    },
  };

  return (
    <motion.div
      className={className}
      style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3em', ...style }}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {words.map((word, index) => (
        <motion.span key={index} variants={child}>
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
}
