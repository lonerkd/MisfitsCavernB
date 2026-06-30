'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        textAlign: 'center',
        padding: '56px 24px',
        borderRadius: 16,
        background: 'rgba(255,255,255,0.015)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div style={{ opacity: 0.25, marginBottom: 16, display: 'flex', justifyContent: 'center' }}>{icon}</div>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--fg-dim)' }}>
        {title}
      </p>
      {subtitle && (
        <p style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)', opacity: 0.6, marginTop: 8 }}>
          {subtitle}
        </p>
      )}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </motion.div>
  );
}
