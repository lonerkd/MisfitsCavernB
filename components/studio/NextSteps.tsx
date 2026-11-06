'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';

interface NextStep {
  label: string;
  description?: string;
  onClick: () => void;
}

interface NextStepsProps {
  steps: NextStep[];
}

/**
 * A "what's next" strip shown at the bottom of a tool view.
 * Suggests 1-2 logical next actions based on current state.
 */
export function NextSteps({ steps }: NextStepsProps) {
  if (steps.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      marginTop: 24,
      padding: '16px 20px',
      borderRadius: 8,
      background: 'rgba(var(--ink-rgb), 0.02)',
      border: '1px solid rgba(var(--ink-rgb), 0.06)',
    }}>
      <span style={{
        fontFamily: 'var(--mono)',
        fontSize: 11,
        color: 'var(--fg-dim)',
        letterSpacing: 'var(--caps-track)',
        textTransform: 'var(--caps)',
      }}>
        What&apos;s next
      </span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {steps.map((step, i) => (
          <button
            key={i}
            type="button"
            onClick={step.onClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 4,
              background: 'var(--accent-dim, rgba(99, 102, 241, 0.1))',
              border: '1px solid var(--accent, #6366f1)',
              color: 'var(--accent, #6366f1)',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {step.label}
            <ArrowRight size={11} />
          </button>
        ))}
      </div>
      {steps.some((s) => s.description) && (
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
          {steps.filter((s) => s.description).map((s) => s.description).join(' · ')}
        </div>
      )}
    </div>
  );
}
