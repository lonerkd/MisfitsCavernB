'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;

  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, onFocus, onBlur, onChange, className = '', ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(Boolean(props.value || props.defaultValue));
    const [showPw, setShowPw] = useState(false);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      if (onFocus) onFocus(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasValue(Boolean(e.target.value));
      if (onBlur) onBlur(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(Boolean(e.target.value));
      if (onChange) onChange(e);
    };

    const isActive = isFocused || hasValue;

    return (
      <div className={`relative mb-6 ${className}`}>
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--fg-muted)] opacity-60">
            {icon}
          </span>
        )}

        <motion.div
          className={`absolute top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-300 font-mono tracking-widest uppercase ${icon ? 'left-10' : 'left-4'} ${
            isActive ? 'text-[var(--accent)]' : 'text-[var(--fg-muted)]'
          }`}
          initial={false}
          animate={{
            y: isActive ? -28 : 0,
            x: isActive ? -4 : 0,
            scale: isActive ? 0.75 : 1,
          }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ originX: 0, originY: 0.5 }}
        >
          {label}
        </motion.div>

        <input
          ref={ref}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          className={`
            w-full bg-[rgba(0,0,0,0.3)]
            border ${error ? 'border-red-500/50' : isFocused ? 'border-[var(--accent)]' : 'border-[rgba(255,255,255,0.08)]'}
            rounded-lg py-4
            ${icon ? 'pl-10 pr-4' : 'px-4'}
            text-[var(--fg)] font-mono text-sm
            outline-none transition-all duration-300
            hover:border-[rgba(255,255,255,0.2)]
            ${props.type === 'password' ? 'pr-12' : ''}
            ${isFocused && !error ? 'shadow-[0_0_0_3px_rgba(215,52,11,0.05)]' : ''}
            ${error ? 'shadow-[0_0_0_3px_rgba(239,68,68,0.05)]' : ''}
          `}
          {...props}

          type={props.type === 'password' && showPw ? 'text' : props.type}
          placeholder={isActive ? props.placeholder : undefined}
        />

        {props.type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
          >
            {showPw ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            )}
          </button>
        )}

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -bottom-5 left-1 text-[0.65rem] font-mono text-red-500/90 tracking-widest uppercase"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
