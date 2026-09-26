import type { ProjectSettings } from '@/lib/types/settings';
import type { UserProfile, UserRole, Permission, ProjectAccess } from '@/lib/context/types';

export interface Beat {
  id: string;
  title: string;
  content: string;
  color?: string;
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  status?: string;
}

export interface BudgetItem {
  id: string;
  category: string;
  description: string;
  amount: number;
  actual_cost?: number;
}

export interface TimelineItem {
  id: string;
  phase: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  completion: number;
}

export interface Campaign {
  id: string;
  title: string;
  platform: string;
  status: string;
  target_demographic?: string;
  budget?: number;
  spend?: number;
  start_date?: string;
  end_date?: string;
}

export interface FestivalSubmission {
  id: string;
  name: string;
  deadline?: string;
  status: 'planned' | 'submitted' | 'accepted' | 'rejected';
  notes?: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  creator_id?: string;
  visibility?: 'private' | 'team' | 'link' | 'public';
  share_token?: string;
  status: string;
  accent_color?: string;
  type?: string;
  project_type?: string;
  beats?: Beat[];
  crew?: CrewMember[];
  budget_items?: BudgetItem[];
  timeline_items?: TimelineItem[];
  campaigns?: Campaign[];
  settings?: ProjectSettings;
  festival_submissions?: FestivalSubmission[];
}

export type SessionStatus = 'resolving' | 'authed' | 'anon';
export type ProjectStatus = 'resolving' | 'ready';

export interface OSIdentity {
  id: string;
  email: string | null;
}

export interface OSSession {
  status: SessionStatus;
  user: UserProfile | null;
  userId: string | null;
  email: string | null;
  userRole: UserRole;
  permissions: Permission[];
  projectAccess: Record<string, ProjectAccess>;
  error: string | null;
}

export interface OSProjectState {
  status: ProjectStatus;
  active: Project | null;
  list: Project[];
}

export interface OSState {
  session: OSSession;
  project: OSProjectState;
}

export type { UserProfile, UserRole, Permission, ProjectAccess, AccessContext } from '@/lib/context/types';
