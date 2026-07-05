'use client';

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

type ButtonVariant = 'solid' | 'ghost' | 'icon' | 'outline' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  external?: boolean;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  children,
  variant = 'solid',
  size = 'md',
  href,
  external,
  fullWidth,
  isLoading,
  leftIcon,
  rightIcon,
  className = '',
  onClick,
  disabled,
  ...props
}: ButtonProps) {
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    // Add ripple effect
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newRipple = { x, y, id: Date.now() };
      setRipples((prev) => [...prev, newRipple]);

      // Remove ripple after animation completes
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 600);
    }

    if (onClick) {
      onClick(e as any);
    }
  };

  const getBaseClasses = () => {
    let classes = 'relative overflow-hidden inline-flex items-center justify-center font-mono uppercase tracking-widest transition-colors duration-300 ';
    
    // Size
    if (variant === 'icon') {
      classes += size === 'sm' ? 'w-8 h-8 rounded-md ' : size === 'md' ? 'w-10 h-10 rounded-md ' : 'w-12 h-12 rounded-lg ';
    } else {
      classes += size === 'sm' ? 'px-3 py-1.5 text-[0.65rem] rounded-md ' : 
                 size === 'md' ? 'px-5 py-2.5 text-[0.7rem] rounded-md ' : 
                 'px-6 py-3 text-[0.75rem] rounded-lg ';
    }

    // Width
    if (fullWidth) classes += 'w-full ';

    // Variant
    switch (variant) {
      case 'solid':
        classes += 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] border border-[var(--accent)] hover:shadow-[0_4px_24px_rgba(215,52,11,0.25)] ';
        break;
      case 'ghost':
        classes += 'bg-transparent text-[var(--fg)] hover:bg-[rgba(255,255,255,0.05)] border border-transparent ';
        break;
      case 'outline':
        classes += 'bg-transparent text-[var(--fg)] border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.02)] ';
        break;
      case 'danger':
        classes += 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 ';
        break;
      case 'icon':
        classes += 'bg-transparent text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[rgba(255,255,255,0.05)] border border-transparent ';
        break;
    }

    // Disabled / Loading
    if (disabled || isLoading) {
      classes += 'opacity-50 cursor-not-allowed pointer-events-none ';
    }

    return classes + className;
  };

  const content = (
    <>
      <span className="relative z-10 flex items-center justify-center gap-2">
        {isLoading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </span>

      {/* Ripples */}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.35 }}
            animate={{ scale: 2.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 100,
              height: 100,
              marginLeft: -50,
              marginTop: -50,
              background: variant === 'solid' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
            }}
          />
        ))}
      </AnimatePresence>
    </>
  );

  const MotionLink = motion(Link);

  if (href) {
    if (external) {
      return (
        <motion.a
          ref={buttonRef as any}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={getBaseClasses()}
          onClick={handleClick as any}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {content}
        </motion.a>
      );
    }
    return (
      <MotionLink
        ref={buttonRef as any}
        href={href}
        className={getBaseClasses()}
        onClick={handleClick as any}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {content}
      </MotionLink>
    );
  }

  return (
    <motion.button
      ref={buttonRef as any}
      className={getBaseClasses()}
      onClick={handleClick as any}
      disabled={disabled || isLoading}
      whileHover={!disabled && !isLoading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !isLoading ? { scale: 0.98 } : {}}
      {...(props as any)}
    >
      {content}
    </motion.button>
  );
}
