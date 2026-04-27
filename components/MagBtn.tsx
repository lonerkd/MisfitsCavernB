'use client';

import { useRef, ReactNode } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface MagBtnProps {
  href?: string;
  onClick?: () => void;
  label: string;
  icon?: ReactNode;
  primary?: boolean;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
  external?: boolean;
}

export default function MagBtn({
  href,
  onClick,
  label,
  icon,
  primary = false,
  type = 'button',
  disabled = false,
  external = false,
}: MagBtnProps) {
  const ref = useRef<HTMLAnchorElement & HTMLButtonElement>(null);

  const handleMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty('--mouse-x', `${((e.clientX - r.left) / r.width) * 100}%`);
    ref.current.style.setProperty('--mouse-y', `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  const sharedStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '13px 28px',
    borderRadius: 'var(--radius-full, 999px)',
    fontFamily: 'var(--mono)',
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    textDecoration: 'none',
    cursor: 'none',
    border: primary ? 'none' : '1px solid rgba(255,255,255,0.15)',
    background: primary
      ? 'var(--accent)'
      : 'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.05) 0%, transparent 70%)',
    color: primary ? 'var(--bg)' : 'var(--fg)',
    fontWeight: primary ? 600 : 400,
    transition: 'background 0.4s, border-color 0.3s',
    position: 'relative',
    overflow: 'hidden',
  };

  const motionProps = {
    whileHover: { y: -2, scale: 1.02 },
    whileTap: { scale: 0.97 },
    onMouseMove: handleMove,
  };

  if (href) {
    const isExternal = external || href.startsWith('http') || href.startsWith('mailto');
    if (isExternal) {
      return (
        <motion.a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={sharedStyle}
          {...motionProps}
        >
          {icon}{label}
        </motion.a>
      );
    }
    return (
      <motion.div {...motionProps} style={{ display: 'inline-block' }}>
        <Link ref={ref as React.Ref<HTMLAnchorElement>} href={href} style={sharedStyle} onMouseMove={handleMove}>
          {icon}{label}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...sharedStyle,
        opacity: disabled ? 0.5 : 1,
      }}
      {...motionProps}
    >
      {icon}{label}
    </motion.button>
  );
}
