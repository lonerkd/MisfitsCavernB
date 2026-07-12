

import { useState, useEffect, useRef } from 'react';

export interface NetworkStatusInfo {
  isOnline: boolean;
  isSlowConnection: boolean;
  lastStatusChange: Date | null;
}

export function useNetworkStatus(): NetworkStatusInfo {
  const [status, setStatus] = useState<NetworkStatusInfo>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSlowConnection: false,
    lastStatusChange: null,
  });

  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: true,
        lastStatusChange: new Date(),
      }));
    };

    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        lastStatusChange: new Date(),
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let connectionMonitor: any;
    let updateConnection: (() => void) | null = null;
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        updateConnection = () => {
          const effectiveType = connection.effectiveType;
          const isSlowConnection = effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g';
          setStatus(prev => ({
            ...prev,
            isSlowConnection,
          }));
        };

        connection.addEventListener('change', updateConnection);
        connectionMonitor = connection;
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connectionMonitor && updateConnection) {
        connectionMonitor.removeEventListener('change', updateConnection);
      }
    };
  }, []);

  return status;
}
