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
      style={{ textAlign: 'center', padding: '48px 24px' }}
    >
      <div aria-hidden="true" style={{ margin: '0 auto 14px', display: 'flex', justifyContent: 'center', color: 'var(--fg-dim)' }}>
        {icon}
      </div>
      <p style={{ fontFamily: 'var(--ui)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--fg)', margin: 0 }}>
        {title}
      </p>
      {subtitle && (
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: '6px auto 0', maxWidth: '40ch', textWrap: 'balance' }}>
          {subtitle}
        </p>
      )}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </motion.div>
  );
}
