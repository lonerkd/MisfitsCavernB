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
        borderRadius: 14,
        background: 'rgba(255,255,255,0.015)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 64, height: 64, margin: '0 auto 16', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--fg-dim)', border: '1px solid var(--border-2)', borderRadius: 14, background: 'var(--bg-2)',
        }}
      >
        {icon}
      </div>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--fg-dim)' }}>
        {title}
      </p>
      {subtitle && (
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', marginTop: 8 }}>
          {subtitle}
        </p>
      )}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </motion.div>
  );
}
