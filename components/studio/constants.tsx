'use client';

import React from 'react';
import { Image, Video, FileText, Music } from 'lucide-react';
import { ClipboardList, BookOpen, Layers, CheckCircle2 } from 'lucide-react';
export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'audio';
  category: string;
  size: string;
  dateAdded: string;
  url?: string;
}

export const STAGES = [
  { id: 'dev', name: 'Development', color: '#ffaa00', icon: BookOpen },
  { id: 'pre', name: 'Pre-Production', color: '#0099ff', icon: ClipboardList },
  { id: 'prod', name: 'Production', color: '#d7340b', icon: Video },
  { id: 'post', name: 'Post-Production', color: '#a855f7', icon: Layers },
  { id: 'del', name: 'Delivery', color: '#00cc66', icon: CheckCircle2 },
];

export const TYPE_ICONS: Record<string, React.ReactNode> = {
  image: <Image size={15} aria-label="image type" />,
  video: <Video size={15} />,
  document: <FileText size={15} />,
  audio: <Music size={15} />,
};

export const TYPE_COLORS: Record<string, string> = {
  image: '#0099ff',
  video: '#d7340b',
  document: '#ffaa00',
  audio: '#00cc66',
};
