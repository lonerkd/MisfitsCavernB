'use client';
import React from 'react';
import { useStudio } from '@/components/studio/StudioContext';
import { WorldEditor } from '@/components/world/WorldEditor';

export function WorldView() {
  const { project } = useStudio();
  return <WorldEditor projectId={project.id} />;
}
