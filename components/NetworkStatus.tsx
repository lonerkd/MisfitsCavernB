import React from 'react';
import { WifiOff, Zap } from 'lucide-react';
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus';

export function NetworkStatusIndicator() {
  const { isOnline, isSlowConnection } = useNetworkStatus();

  if (isOnline && !isSlowConnection) {
    return null;
  }

  const message = !isOnline
    ? 'You are offline. Changes will sync when connection is restored.'
    : isSlowConnection
    ? 'Slow connection detected. Some features may be limited.'
    : null;

  if (!message) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      background: 'rgba(215, 52, 11, 0.1)',
      border: '1px solid rgba(215, 52, 11, 0.3)',
      borderRadius: 8,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontFamily: 'var(--mono)',
      fontSize: 11,
      color: 'var(--accent)',
      backdropFilter: 'blur(10px)',
      zIndex: 999,
      maxWidth: 280,
      animation: 'slideIn 0.3s ease-out',
    }}>
      {!isOnline ? (
        <WifiOff size={14} />
      ) : (
        <Zap size={14} />
      )}
      <span>{message}</span>
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
