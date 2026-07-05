'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  maxLength?: number;
  autoResize?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, maxLength, autoResize = true, onFocus, onBlur, onChange, className = '', ...props }, forwardedRef) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(Boolean(props.value || props.defaultValue));
    const [charCount, setCharCount] = useState(String(props.value || props.defaultValue || '').length);
    
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const ref = (forwardedRef as any) || internalRef;

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true);
      if (onFocus) onFocus(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false);
      setHasValue(Boolean(e.target.value));
      if (onBlur) onBlur(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setHasValue(Boolean(e.target.value));
      setCharCount(e.target.value.length);
      
      if (autoResize && ref.current) {
        ref.current.style.height = 'auto';
        ref.current.style.height = `${ref.current.scrollHeight}px`;
      }
      
      if (onChange) onChange(e);
    };

    // Initial resize if needed
    useEffect(() => {
      if (autoResize && ref.current && (props.value || props.defaultValue)) {
        ref.current.style.height = 'auto';
        ref.current.style.height = `${ref.current.scrollHeight}px`;
      }
    }, [autoResize, props.value, props.defaultValue, ref]);

    const isActive = isFocused || hasValue;
    const isNearLimit = maxLength ? charCount > maxLength * 0.9 : false;
    const isOverLimit = maxLength ? charCount > maxLength : false;

    return (
      <div className={`relative mb-6 ${className}`}>
        <motion.div
          className={`absolute left-4 top-4 pointer-events-none transition-colors duration-300 font-mono tracking-widest uppercase ${
            isActive ? 'text-[var(--accent)]' : 'text-[var(--fg-muted)]'
          }`}
          initial={false}
          animate={{
            y: isActive ? -28 : 0,
            x: isActive ? -4 : 0,
            scale: isActive ? 0.75 : 1,
          }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ originX: 0, originY: 0 }}
        >
          {label}
        </motion.div>

        <textarea
          ref={ref}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          maxLength={maxLength}
          className={`
            w-full bg-[rgba(0,0,0,0.3)] 
            border ${error || isOverLimit ? 'border-red-500/50' : isFocused ? 'border-[var(--accent)]' : 'border-[rgba(255,255,255,0.08)]'}
            rounded-lg px-4 py-4 min-h-[120px] resize-none
            text-[var(--fg)] font-serif text-sm leading-relaxed
            outline-none transition-all duration-300
            hover:border-[rgba(255,255,255,0.2)]
            ${isFocused && !error && !isOverLimit ? 'shadow-[0_0_0_3px_rgba(215,52,11,0.05)]' : ''}
            ${(error || isOverLimit) ? 'shadow-[0_0_0_3px_rgba(239,68,68,0.05)]' : ''}
          `}
          {...props}
          placeholder={isActive ? props.placeholder : undefined}
        />

        <div className="absolute -bottom-6 left-1 right-1 flex justify-between items-center text-[0.65rem] font-mono tracking-widest uppercase">
          <div className="flex-1">
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-red-500/90"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          
          {maxLength && (
            <motion.div 
              className={`transition-colors duration-300 ${
                isOverLimit ? 'text-red-500' : isNearLimit ? 'text-amber-500' : 'text-[var(--fg-muted)]'
              }`}
              initial={false}
              animate={{ scale: isNearLimit ? 1.05 : 1 }}
            >
              {charCount} / {maxLength}
            </motion.div>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
