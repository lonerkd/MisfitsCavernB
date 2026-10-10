import type { ProjectSettings } from '@/lib/types/settings';

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
  /** Shelved by the owner: off the board and the pickers until restored. */
  archived_at?: string | null;
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
  /** From the private account row (get_my_account); only the admin pages read it. Every other permission is RLS, mirrored in the UI by useCanShape. */
  isAdmin: boolean;
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

/** The signed-in person's public profile, as the OS holds it. */
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  role: string;
  location?: string;
  status: 'OPEN' | 'BUSY';
  is_admin?: boolean;
  created_at: string;
  updated_at: string;
}
