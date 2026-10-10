'use client';

// Sends every uncaught error and unhandled rejection in the browser to the
// suite's error log (Admin › Errors). Renders nothing.

import { useEffect } from 'react';
import { reportError } from '@/lib/errors/report';

export default function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => { void reportError('window', e.error ?? e.message); };
    const onRejection = (e: PromiseRejectionEvent) => { void reportError('promise', e.reason); };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => { window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onRejection); };
  }, []);
  return null;
}
