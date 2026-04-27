'use client';

import { motion } from 'framer-motion';

interface SectionLabelProps {
  text: string;
  center?: boolean;
}

export default function SectionLabel({ text, center = false }: SectionLabelProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 40,
      justifyContent: center ? 'center' : 'flex-start',
    }}>
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: 32 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{ height: 1, background: 'var(--accent)', flexShrink: 0 }}
      />
      <motion.span
        initial={{ opacity: 0, x: -8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.2 }}
        style={{
          fontSize: 9,
          letterSpacing: 6,
          textTransform: 'uppercase',
          color: 'var(--accent)',
          fontFamily: 'var(--mono)',
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </motion.span>
      {center && (
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: 32 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{ height: 1, background: 'var(--accent)', flexShrink: 0 }}
        />
      )}
    </div>
  );
}
