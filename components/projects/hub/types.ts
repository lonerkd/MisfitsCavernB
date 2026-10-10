import type { Phase } from '@/lib/os';
import type { ProjectSettings } from '@/lib/types/settings';

export interface ProjectHubViewModel {
  id: string;
  title: string;
  type: string;
  phase: Phase;
  deadline: string;
  team: { name: string; role: string; online?: boolean }[];
  description: string;
  color: string;
  /** The accent as the owner chose it (null: the theme's), for panels that derive their own shades from it. */
  accent?: string | null;
  scriptPages?: number;
  scriptDraft?: number;
  assetCount?: number;
  assetGB?: number;
  publishedWork?: number;
  settings?: ProjectSettings;
  visibility: 'private' | 'team' | 'link' | 'public';
  shareUrl: string;
  isOwner: boolean;
}
