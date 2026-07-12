'use client';

import React from 'react';
import type { Permission, AccessContext } from '@/lib/context/types';
import { useOSStore } from './store';
import { osCanPerformAction } from './actions';

interface ActionButtonProps {
  permission: Permission;
  context?: AccessContext;
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
  title?: string;
  disabledTooltip?: string;
}

export function ActionButton({
  permission, context, children, onClick, style, className, title, disabledTooltip,
}: ActionButtonProps) {
  useOSStore((s) => s.session);
  const allowed = osCanPerformAction(permission, context);

  return (
    <button
      onClick={onClick}
      disabled={!allowed}
      style={style}
      className={className}
      title={allowed ? title : disabledTooltip || 'You do not have permission to perform this action'}
    >
      {children}
    </button>
  );
}

interface IfAccessProps {
  permission: Permission;
  context?: AccessContext;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function IfAccess({ permission, context, children, fallback }: IfAccessProps) {
  useOSStore((s) => s.session);
  const allowed = osCanPerformAction(permission, context);
  return <>{allowed ? children : fallback}</>;
}

interface ProtectedPageProps {
  requiredPermission: Permission;
  context?: AccessContext;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedPage({ requiredPermission, context, children, fallback }: ProtectedPageProps) {
  const session = useOSStore((s) => s.session);

  if (session.status === 'resolving') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, opacity: 0.5 }}>LOADING...</div>
      </div>
    );
  }

  if (!osCanPerformAction(requiredPermission, context)) {
    return (
      fallback || (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', fontFamily: 'var(--mono)', color: 'var(--fg)',
        }}>
          <h1 style={{ fontSize: '2rem', letterSpacing: 2, marginBottom: 16 }}>ACCESS DENIED</h1>
          <p style={{ fontSize: 11, opacity: 0.6 }}>You do not have permission to access this page.</p>
        </div>
      )
    );
  }

  return <>{children}</>;
}
