'use client';

import React, { useEffect } from 'react';
import { bootOS } from './boot';
import { registerOSNotifier } from './notify';
import { useToast } from '@/components/Toast';

export function OSProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();

  useEffect(() => {
    registerOSNotifier(toast);
    bootOS();
  }, [toast]);

  return <>{children}</>;
}
